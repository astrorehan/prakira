/**
 * Konfigurasi runtime gateway.
 *
 * Semua nilai punya default yang bisa dipakai langsung di mesin pengembang,
 * sehingga `npm run dev` jalan tanpa berkas `.env`. Yang tidak boleh punya
 * default adalah rahasia produksi — lihat `SESSION_SECRET` di bawah.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Akar repositori: backend/src -> backend -> repo. */
export const REPO_ROOT = path.resolve(here, "..", "..");
export const BACKEND_ROOT = path.resolve(here, "..");

/** Membaca `.env` sederhana tanpa dependensi. Baris `KEY=value`, `#` komentar. */
function loadDotEnv(): void {
  const file = path.join(BACKEND_ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

/** Menambahkan `https://` bila nilai berupa host telanjang seperti `x.onrender.com`. */
function withScheme(value: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

const isProduction = process.env.NODE_ENV === "production";

/** Wajib di semua lingkungan — tidak ada nilai bawaan yang aman. */
function requiredAlways(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `${key} wajib diisi. Salin connection string Supabase ke backend/.env — ` +
        "lihat docs/DEPLOY.md.",
    );
  }
  return value;
}

function requiredInProduction(key: string, fallback: string): string {
  const value = process.env[key];
  if (value) return value;
  if (isProduction) {
    throw new Error(
      `${key} wajib diisi saat NODE_ENV=production. Gateway menolak jalan dengan nilai bawaan.`,
    );
  }
  return fallback;
}

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 4200),

  /* Basis URL layanan ML FastAPI (`ml-services`).
     Render mengisi variabel ini dari nama host layanan saudaranya, tanpa
     skema — jadi skema ditambahkan di sini alih-alih menyuruh operator
     menempelkan URL lengkap dari dasbor. */
  mlServiceUrl: withScheme(
    process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8001",
  ),
  /** Batas tunggu panggilan ke layanan ML, dalam milidetik. */
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS ?? 20000),
  /* Token bersama untuk layanan ML. Kosong di pengembangan — layanan ML juga
     melewati pemeriksaan bila tokennya kosong, jadi keduanya cocok tanpa
     berkas `.env`. Di produksi wajib, karena di sana URL layanan ML publik. */
  mlApiToken: requiredInProduction("ML_API_TOKEN", ""),

  /* Postgres (Supabase). Tidak ada nilai bawaan yang masuk akal: sebuah URL
     yang salah akan gagal saat koneksi pertama, jauh dari tempat kesalahannya
     dibuat. Lebih baik menolak start dengan pesan yang menyebut nama variabelnya. */
  databaseUrl: requiredAlways("DATABASE_URL"),
  /* Supabase pooler membatasi koneksi per proyek. Kolam kecil sudah cukup:
     gateway ini satu proses dan query-nya pendek. */
  databasePoolMax: Number(process.env.DATABASE_POOL_MAX ?? 5),
  /* Supabase mewajibkan TLS. Dimatikan hanya untuk Postgres lokal tanpa
     sertifikat. */
  databaseSsl: (process.env.DATABASE_SSL ?? "true").toLowerCase() !== "false",

  /** Direktori `ml-services`, sumber dataset historis untuk seeding. */
  datasetRoot: process.env.DATASET_ROOT ?? path.join(REPO_ROOT, "ml-services"),

  /** GeoJSON kecamatan — sumber batas wilayah & sentroid. */
  geojsonFile:
    process.env.GEOJSON_FILE ??
    path.join(REPO_ROOT, "frontend", "src", "data", "semarang-kecamatan.json"),

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /* Kunci tanda tangan sesi. Di pengembangan diacak per proses: sesi lama
     hangus saat server dinyalakan ulang, dan itu perilaku yang benar untuk
     rahasia yang tidak pernah ditulis ke mana pun. */
  sessionSecret: requiredInProduction(
    "SESSION_SECRET",
    crypto.randomBytes(32).toString("hex"),
  ),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),

  /** Akun awal dinas. Kata sandi wajib diganti lewat env di produksi. */
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "dinkes@prakira.id",
  seedAdminPassword: requiredInProduction("SEED_ADMIN_PASSWORD", "prakira2026"),
  seedAdminLabel:
    process.env.SEED_ADMIN_LABEL ?? "Dinas Kesehatan Kota Semarang",

  /** §5.4 — batas laporan warga per perangkat. */
  reportRateLimit: {
    max: Number(process.env.REPORT_RATE_MAX ?? 3),
    windowHours: Number(process.env.REPORT_RATE_WINDOW_HOURS ?? 24),
  },

  /* Batas percobaan masuk per alamat. Lima percobaan per seperempat jam
     longgar untuk petugas yang salah ketik dan sempit untuk yang menebak:
     ruang kata sandi apa pun yang layak disebut kata sandi tidak habis pada
     laju 480 tebakan per hari. */
  loginRateLimit: {
    max: Number(process.env.LOGIN_RATE_MAX ?? 5),
    windowMinutes: Number(process.env.LOGIN_RATE_WINDOW_MINUTES ?? 15),
  },

  /* Berapa lapis proksi yang boleh dipercaya saat membaca alamat pengirim.
     Render menaruh proksinya sendiri di depan setiap layanan, jadi tanpa
     nilai ini `req.ip` berisi alamat proksi itu — sama untuk semua orang.
     Pembatas laju yang membaca alamat begitu akan mengunci seluruh dunia
     dalam satu ember begitu ada satu penebak, dan batas laporan warga
     kehilangan sebagian besar dayanya.

     Angkanya sengaja tidak `true`. `true` berarti mempercayai seluruh rantai
     `X-Forwarded-For`, dan rantai itu ditulis klien: siapa pun bisa
     menambahkan alamat palsu di depannya lalu memakai alamat baru setiap
     percobaan. Angka 1 mengambil satu lompatan terakhir — yang ditambahkan
     proksi Render sendiri dan tidak bisa dipalsukan dari luar. Di
     pengembangan tidak ada proksi, jadi bawaannya mati. */
  trustProxy: process.env.TRUST_PROXY
    ? Number(process.env.TRUST_PROXY)
    : isProduction
      ? 1
      : 0,
} as const;
