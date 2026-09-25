/** Rotasi eksplisit untuk akun seed yang sudah ada di database. */
import { closeDb, transaction } from "./index.js";
import { env } from "../env.js";
import { hashPassword } from "../services/password.js";

const accounts = [
  { email: env.seedAdminEmail, key: "SEED_ADMIN_PASSWORD" },
  { email: "dinkes@prakira.id", key: "SEED_DINKES_PASSWORD" },
  { email: "puskesmas@prakira.id", key: "SEED_PUSKESMAS_PASSWORD" },
] as const;

async function rotate(): Promise<void> {
  for (const { key } of accounts) {
    if (!process.env[key]?.trim()) {
      throw new Error(`${key} wajib diisi secara eksplisit untuk rotasi.`);
    }
  }

  await transaction(async (tx) => {
    for (const { email, key } of accounts) {
      const user = await tx.one<{ id: string }>(
        "SELECT id FROM users WHERE email = ?",
        email,
      );
      if (!user) throw new Error(`Akun seed ${email} belum ada.`);

      const { hash, salt } = await hashPassword(process.env[key]!);
      await tx.run(
        "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
        hash,
        salt,
        user.id,
      );
      await tx.run("DELETE FROM sessions WHERE user_id = ?", user.id);
    }
  });
}

rotate()
  .then(() => console.log("Kata sandi tiga akun seed diperbarui; sesi lama dicabut."))
  .catch((error) => {
    console.error("Rotasi kata sandi gagal:", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
