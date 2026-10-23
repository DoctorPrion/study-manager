import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/** 4자리 PIN은 경우의 수가 1만 개뿐이라, 솔트 + 느린 해시(scrypt)로 저장하고 시도 횟수도 제한한다. */
function derive(pin: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pin, salt, 32, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** "솔트(hex):해시(hex)" 형식 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await derive(pin, salt)).toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await derive(pin, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
