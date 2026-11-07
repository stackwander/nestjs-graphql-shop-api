import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

// OWASP scrypt baseline: N=2^17, r=8, p=1. Version the encoding for future upgrades.
function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt);
  return `scrypt-v1:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [version, salt, hex] = encoded.split(':');
  if (
    version !== 'scrypt-v1' ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(hex ?? '')
  )
    return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(expected, actual);
}
