#!/usr/bin/env node
/**
 * Menjalankan tiga layanan Prakira sekaligus.
 *
 * Mengatur urutan startup (ML -> Gateway -> Frontend) dan memastikan pembersihan
 * seluruh process tree saat aplikasi dihentikan (termasuk di Windows).
 */
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const COLORS = {
  gateway: "\x1b[36m",
  frontend: "\x1b[35m",
  ml: "\x1b[33m",
  reset: "\x1b[0m",
};

const children = [];

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    shell: options.shell ?? isWindows,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
    /* Menjadikan anaknya pemimpin grup proses, supaya `process.kill(-pid)` di
       `signalTree` benar-benar menjangkau cucu-cucunya: uvicorn menyalakan
       worker, dan `next dev` menyalakan proses build sendiri. Tanpa ini
       sinyalnya tidak sampai ke mana pun. Di Windows tidak ada grup proses
       POSIX — di sana `taskkill /T` yang mengerjakannya. */
    detached: !isWindows,
  });

  const prefix = `${COLORS[name] ?? ""}[${name}]${COLORS.reset} `;
  const pipe = (stream, target) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) target.write(`${prefix}${line}\n`);
    });
    stream.on("end", () => {
      if (buffer.trim()) target.write(`${prefix}${buffer}\n`);
    });
  };

  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      process.stdout.write(`${prefix}keluar dengan kode ${code}\n`);
    }
  });

  children.push(child);
  return child;
}

/** Interpreter Python layanan ML, bila lingkungan virtualnya sudah dibuat. */
function findPython() {
  const candidates = isWindows
    ? [
        path.join(root, "ml-services", ".venv", "Scripts", "python.exe"),
        path.join(root, "ml-services", "venv", "Scripts", "python.exe"),
      ]
    : [
        path.join(root, "ml-services", ".venv", "bin", "python"),
        path.join(root, "ml-services", "venv", "bin", "python"),
      ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

async function waitForHttp(url, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function main() {
  const python = findPython();
  if (python) {
    run("ml", python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"], {
      cwd: path.join(root, "ml-services"),
      shell: false,
    });
    // Tunggu FastAPI siap sebelum gateway melakukan fetch
    await waitForHttp("http://127.0.0.1:8001/health", 4000);
  } else {
    process.stdout.write(
      `${COLORS.ml}[ml]${COLORS.reset} lingkungan virtual belum dibuat — layanan model dilewati.\n` +
        `${COLORS.ml}[ml]${COLORS.reset} Buat dengan: python -m venv ml-services/.venv && ml-services/.venv/Scripts/pip install -r ml-services/requirements.txt\n` +
        `${COLORS.ml}[ml]${COLORS.reset} Tanpa layanan ini, dashboard menampilkan observasi historis dan menandai prakiraannya belum diperbarui.\n`,
    );
  }

  const npmCmd = isWindows ? "npm.cmd" : "npm";

  run("gateway", npmCmd, ["run", "dev"], {
    cwd: path.join(root, "backend"),
    shell: isWindows,
  });

  // Beri jeda singkat agar gateway mulai listen sebelum frontend menyala
  await new Promise((r) => setTimeout(r, 600));

  run("frontend", npmCmd, ["run", "dev"], {
    cwd: path.join(root, "frontend"),
    shell: isWindows,
  });
}

function isAlive(child) {
  return Boolean(child?.pid) && child.exitCode === null && child.signalCode === null;
}

/**
 * Menghentikan satu anak beserta seluruh keturunannya.
 *
 * `process.kill(-pid, …)` mengirim sinyal ke *grup* proses, dan itu hanya
 * bekerja bila anaknya pemimpin grup — yang menuntut `detached: true` saat
 * `spawn`, dan sebelumnya tidak diset. Panggilannya karena itu selalu melempar
 * ESRCH, galatnya ditelan `catch` kosong, dan uvicorn serta Next tetap hidup
 * setelah Ctrl+C. Port 8001 dan 3000 tetap terpakai, lalu `npm run dev`
 * berikutnya gagal dengan alasan yang tidak menyebut sebabnya — persis jenis
 * kejadian yang menghabiskan waktu saat menyiapkan demo.
 */
function signalTree(child, signal) {
  if (!isAlive(child)) return;
  try {
    if (isWindows) {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-child.pid, signal);
    }
  } catch (error) {
    /* ESRCH berarti prosesnya memang sudah mati — itu keberhasilan. Sisanya
       harus terlihat: `catch` kosong di sini justru yang membuat kebocoran
       proses di atas hidup tanpa ketahuan. */
    if (error?.code !== "ESRCH") {
      process.stderr.write(
        `[dev] gagal menghentikan pid ${child.pid}: ${error.message}\n`,
      );
    }
  }
}

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) signalTree(child, "SIGTERM");

  /* Beri kesempatan menutup diri sendiri sebelum dipaksa. Next menulis ke
     `.next/` saat keluar, dan SIGKILL langsung meninggalkannya setengah
     tertulis — yang muncul sebagai galat build membingungkan di sesi
     berikutnya, bukan sebagai "tadi saya tekan Ctrl+C". */
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && children.some(isAlive)) {
    await new Promise((r) => setTimeout(r, 100));
  }

  for (const child of children) signalTree(child, "SIGKILL");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(console.error);
