import { randomInt } from "node:crypto";

// 헷갈리기 쉬운 문자(0/O, 1/I)를 제외한 알파벳
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}
