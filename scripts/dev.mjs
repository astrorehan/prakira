#!/usr/bin/env node
/**
 * Menjalankan tiga layanan Prakira sekaligus.
 *
 * Tanpa dependensi apa pun: `concurrently` dan kawan-kawannya hanya dipakai
 * untuk menyalakan tiga proses dan mewarnai prefiksnya, dan itu tidak sepadan
 * dengan satu entri lagi di pohon dependensi yang harus dipasang juri.
 *
 * Layanan ML bersifat opsional di sini. Ia butuh Python dan lingkungan
 * virtualnya sendiri; kalau tidak ditemukan, skrip ini berkata apa adanya dan
 * dua layanan lain tetap jalan — gateway sudah menandai prediksinya `stale`.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const COLORS = {
  gateway: "[36m",
  frontend: "[35m",
  ml: "[33m",
  reset: "[0m",
};

const children = [];

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    shell: isWindows,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
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
  };

  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("exit", (code) => {
    process.stdout.write(`${prefix}keluar dengan kode ${code}\n`);
  });

  children.push(child);
  return child;
}

/** Interpreter Python layanan ML, bila lingkungan virtualnya sudah dibuat. */
function findPython() {
  const candidates = isWindows
    ? [path.join(root, "ml-services", ".venv", "Scripts", "python.exe")]
    : [path.join(root, "ml-services", ".venv", "bin", "python")];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const python = findPython();
if (python) {
  run("ml", python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"], {
    cwd: path.join(root, "ml-services"),
  });
} else {
  process.stdout.write(
    `${COLORS.ml}[ml]${COLORS.reset} lingkungan virtual belum dibuat — layanan model dilewati.\n` +
      `${COLORS.ml}[ml]${COLORS.reset} Buat dengan: python -m venv ml-services/.venv && ml-services/.venv/Scripts/pip install -r ml-services/requirements.txt\n` +
      `${COLORS.ml}[ml]${COLORS.reset} Tanpa layanan ini, dashboard menampilkan observasi historis dan menandai prakiraannya belum diperbarui.\n`,
  );
}

run("gateway", "npm", ["--prefix", "backend", "run", "dev"]);
run("frontend", "npm", ["--prefix", "frontend", "run", "dev"]);

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
