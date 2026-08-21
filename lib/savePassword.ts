/** Hash / verificação de senha de save (scrypt + migração de plaintext). */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

const HASH_PREFIX = "scrypt$v1$";
const KEY_LEN = 32;
const SALT_LEN = 16;

function toB64(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function isPasswordHashed(stored: string): boolean {
  return stored.startsWith(HASH_PREFIX);
}

/** Gera hash scrypt no formato `scrypt$v1$salt$hash`. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived = (await scrypt(plain, salt, KEY_LEN)) as Buffer;
  return `${HASH_PREFIX}${toB64(salt)}$${toB64(derived)}`;
}

function safeEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Compara senha digitada com o valor no banco.
 * Aceita hashes novos e plaintext legado (e sinaliza rehash).
 */
export async function verifyPassword(
  stored: string,
  plain: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored || !plain) return { ok: false, needsRehash: false };

  if (isPasswordHashed(stored)) {
    const parts = stored.split("$");
    // scrypt$v1$salt$hash → ["scrypt", "v1", salt, hash]
    if (parts.length !== 4 || parts[0] !== "scrypt" || parts[1] !== "v1") {
      return { ok: false, needsRehash: false };
    }
    const salt = fromB64(parts[2]!);
    const expected = fromB64(parts[3]!);
    const derived = (await scrypt(plain, salt, expected.length)) as Buffer;
    if (derived.length !== expected.length) {
      return { ok: false, needsRehash: false };
    }
    return {
      ok: timingSafeEqual(derived, expected),
      needsRehash: false,
    };
  }

  // Legado: senha em texto puro — compara e pede upgrade.
  return {
    ok: safeEqualStrings(stored, plain),
    needsRehash: true,
  };
}
