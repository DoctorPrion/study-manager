// db/schema.sql 을 DATABASE_URL 의 DB에 적용한다. 사용: npm run db:init
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 환경변수가 없습니다. (.env.local 확인)");
  process.exit(1);
}
const sql = neon(url);
const statements = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

for (const stmt of statements) await sql.query(stmt);
console.log(`스키마 적용 완료 (${statements.length}개 구문)`);
