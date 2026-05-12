/**
 * Password hashing for share links using Node.js built-in `crypto.scrypt`.
 *
 * Hash format stored in the DB: "scrypt:<salt_hex>:<hash_hex>"
 * Params: N=16384, r=8, p=1, keylen=64 (OWASP-recommended baseline).
 *
 * Server-only — do NOT import in client components.
 */

import { randomBytes, scrypt, timingSafeEqual } from "crypto";

const SALT_BYTES = 16;
const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const PREFIX = "scrypt";

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

export async function hashSharePassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt);
  return `${PREFIX}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifySharePassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");

  try {
    const derived = await scryptAsync(password, salt);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
