// SQL 파일을 DATABASE_URL 의 DB에 적용한다. 기본은 db/schema.sql.
// 사용: npm run db:init  /  npm run db:migrate -- db/migrations/001_add_study_owner.sql
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 환경변수가 없습니다. (.env.local 확인)");
  process.exit(1);
}
const file = process.argv[2] ?? new URL("../db/schema.sql", import.meta.url);
const sql = neon(url);
const statements = readFileSync(file, "utf8")
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

for (const stmt of statements) await sql.query(stmt);
console.log(`SQL 적용 완료 (${statements.length}개 구문)`);
