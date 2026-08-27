/**
 * Kata sandi — scrypt dari `node:crypto`.
 *
 * Bukan bcrypt/argon2 karena keduanya modul native: satu kegagalan kompilasi
 * di mesin lain membuat seluruh gateway tidak bisa dipasang. scrypt bawaan
 * Node adalah KDF yang memang dirancang untuk kata sandi (RFC 7914), dan
 * perbandingannya di bawah memakai waktu tetap.
 */
import crypto from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_PARAMS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS)
    .toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}
