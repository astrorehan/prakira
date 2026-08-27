/**
 * Koneksi Postgres (Supabase).
 *
 * Sebelumnya lapisan ini memakai `node:sqlite`, dan seluruh gateway ditulis
 * sinkron karena itu. Yang berubah saat pindah bukan hanya drivernya:
 * `pg` asinkron, jadi `all`/`one`/`run` sekarang mengembalikan `Promise` dan
 * setiap pemanggilnya ikut menunggu.
 *
 * Query tetap ditulis dengan placeholder `?` seperti sebelumnya. `toPg` yang
 * menerjemahkannya ke `$1..$n` milik Postgres, jadi 56 query di seluruh
 * `services/` tidak perlu ditulis ulang satu per satu — dan tidak ada satu
 * pun string SQL di repositori ini yang mengandung `?` literal, sehingga
 * penggantian buta itu aman.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "../env.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/* `COUNT(*)` dan kolom `BIGINT` sampai sebagai string di `pg`, karena int8
   tidak selalu muat di `number`. Nilai kita jauh di bawah batas itu, dan
   kode pemanggil sudah memperlakukannya sebagai angka — tanpa parser ini
   `historyMonths` akan terbaca "12" alih-alih 12 dan diam-diam lolos ke JSON. */
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

let pool: pg.Pool | null = null;
let ready: Promise<pg.Pool> | null = null;

function createPool(): pg.Pool {
  return new pg.Pool({
    connectionString: env.databaseUrl,
    /* Supabase menutup koneksi menganggur; kolam kecil dengan idle timeout
       pendek lebih cocok daripada menahan koneksi yang sudah mati. */
    max: env.databasePoolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });
}

/** Menyiapkan kolam koneksi dan menerapkan skema. Aman dipanggil berulang. */
export function db(): Promise<pg.Pool> {
  if (ready) return ready;

  ready = (async () => {
    pool = createPool();

    /* Skema ikut dibaca dari `src` saat dijalankan lewat tsx, dan dari `dist`
       setelah di-build — `tsc` tidak menyalin berkas non-TS. */
    const candidates = [
      path.join(here, "schema.sql"),
      path.join(here, "..", "..", "src", "db", "schema.sql"),
    ];
    const schemaPath = candidates.find((p) => fs.existsSync(p));
    if (!schemaPath)
      throw new Error("schema.sql tidak ditemukan di " + candidates.join(", "));

    await pool.query(fs.readFileSync(schemaPath, "utf8"));
    return pool;
  })();

  return ready;
}

/** `?` -> `$1..$n`. Lihat catatan di kepala berkas soal mengapa ini aman. */
function toPg(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

async function query<T>(sql: string, params: unknown[]): Promise<T[]> {
  const handle = await db();
  const result = await handle.query({
    text: toPg(sql),
    values: params as never[],
  });
  return result.rows as T[];
}

/**
 * Menjalankan sekumpulan penulisan dalam satu transaksi.
 *
 * Klien khusus diambil dari kolam supaya `BEGIN` dan `COMMIT` benar-benar
 * mendarat di koneksi yang sama — dengan kolam, `pool.query` bisa memilih
 * koneksi berbeda tiap panggilan dan transaksinya akan bocor.
 */
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const handle = await db();
  const client = await handle.connect();
  const tx: Tx = {
    all: async <R>(sql: string, ...params: unknown[]) =>
      (await client.query({ text: toPg(sql), values: params as never[] }))
        .rows as R[],
    one: async <R>(sql: string, ...params: unknown[]) =>
      ((await client.query({ text: toPg(sql), values: params as never[] }))
        .rows[0] as R) ?? null,
    run: async (sql: string, ...params: unknown[]) => {
      await client.query({ text: toPg(sql), values: params as never[] });
    },
  };

  try {
    await client.query("BEGIN");
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export type Tx = {
  all<R = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<R[]>;
  one<R = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<R | null>;
  run(sql: string, ...params: unknown[]): Promise<void>;
};

/** `SELECT` banyak baris, sudah bertipe. */
export function all<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  return query<T>(sql, params);
}

/** `SELECT` satu baris, `null` bila tidak ada. */
export async function one<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** `INSERT`/`UPDATE`/`DELETE`. */
export async function run(sql: string, ...params: unknown[]): Promise<void> {
  await query(sql, params);
}

/** Benar bila tabel inti sudah terisi — dipakai untuk auto-seed saat start. */
export async function isSeeded(): Promise<boolean> {
  const row = await one<{ n: number }>("SELECT COUNT(*) AS n FROM kecamatan");
  return (row?.n ?? 0) > 0;
}

/** Menutup kolam koneksi. Dipakai skrip sekali-jalan seperti `npm run seed`. */
export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
  ready = null;
}
