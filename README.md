# 스터디 매니저

여러 명이 함께 하는 스터디의 과제·일정과 각자의 진행 상황을 한 곳에서 관리하는 웹 앱입니다.
Next.js(App Router) · TypeScript · Tailwind CSS · Neon PostgreSQL · Vercel. 로그인은 없고, 현재 사용자는 브라우저 localStorage에 저장됩니다.

## 실행 방법

### 1. Neon 데이터베이스 준비
1. [Neon](https://neon.tech)에서 프로젝트를 만듭니다.
2. 대시보드의 **Connection string**(`postgresql://...?sslmode=require`)을 복사합니다.

### 2. 환경변수
```bash
cp .env.example .env.local
```
`.env.local`의 `DATABASE_URL`에 복사한 연결 문자열을 넣습니다.

### 3. 설치와 테이블 생성
```bash
npm install
npm run db:init      # db/schema.sql 을 DATABASE_URL 의 DB에 적용
```
`db:init`을 쓰지 않으려면 Neon 콘솔의 SQL Editor에 [db/schema.sql](db/schema.sql) 내용을 붙여 넣어 실행해도 됩니다. (재실행해도 안전: `IF NOT EXISTS`)

### 4. 개발 서버
```bash
npm run dev
```
http://localhost:3000 에서 확인합니다.

### 5. 빌드·타입 검사
```bash
npm run lint    # tsc --noEmit
npm run build
```

## Vercel 배포
1. 저장소를 Vercel에 import 합니다.
2. **Settings → Environment Variables**에 `DATABASE_URL`을 추가합니다.
3. Deploy. (테이블 생성은 로컬에서 한 번 `npm run db:init` 하면 됩니다. 같은 Neon DB를 쓰기 때문입니다.)

## 동작 메모
- 참여 코드: 헷갈리기 쉬운 문자(0/O, 1/I)를 뺀 영문 대문자·숫자 6자리.
- 닉네임은 같은 스터디 안에서 대소문자 구분 없이 중복 불가. 입장 시 숫자 4자리 PIN 필수: 새 닉네임은 등록, 기존 닉네임은 PIN이 맞아야 재입장(스터디장 권한 유지). PIN은 scrypt 해시로 저장하고 5회 실패 시 15분간 잠급니다. PIN이 없는 기존 멤버는 다음 입장 때 입력한 PIN이 등록됩니다.
- 마이그레이션: `npm run db:migrate -- db/migrations/002_add_member_pin.sql`
- 과제 목록은 마감일 순. "마감 지남"은 서버 UTC가 아니라 **한국 시간(Asia/Seoul)** 의 오늘 기준으로 DB에서 계산합니다.
- 스터디장: 처음 입장한 멤버(`studies.owner_member_id`). 스터디장은 나갈 수 없고 스터디 삭제만 가능합니다.
- 스터디를 삭제하면 멤버·과제·완료 기록이 `ON DELETE CASCADE`로 함께 삭제됩니다. 삭제는 서버에서 스터디장 여부와 스터디 이름 일치를 검사합니다.
- 기존 DB 업그레이드: `npm run db:migrate -- db/migrations/001_add_study_owner.sql`
- 완료 취소는 `DELETE /api/tasks/:taskId/completion?memberId=` 로 호출합니다.

## 주의 (로그인 없음)
memberId를 알면 누구나 해당 멤버로 완료 체크를 할 수 있고, 참여 코드를 아는 사람은 과제를 수정·삭제할 수 있습니다. 소규모 스터디용 전제입니다.

## API
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/studies` | 스터디 생성 |
| POST | `/api/studies/join` | 코드+닉네임으로 입장 |
| GET | `/api/studies/:joinCode?memberId=` | 스터디·멤버별 진행률 |
| GET/POST | `/api/studies/:joinCode/tasks` | 과제 목록(마감일 순) / 추가 |
| GET/PATCH/DELETE | `/api/tasks/:taskId` | 과제 조회 / 수정 / 삭제 |
| DELETE | `/api/studies/:joinCode` | 스터디 삭제 (스터디장만, body: `{memberId, confirmName}`) |
| DELETE | `/api/studies/:joinCode/members/:memberId` | 멤버 나가기 (스터디장 불가) |
| POST | `/api/studies/:joinCode/members/:memberId/kick` | 멤버 추방 (스터디장만, body: `{memberId: 스터디장 id}`). 닉네임은 재입장 차단 |
| PUT | `/api/tasks/:taskId/completion` | 완료 체크 (body: `{memberId}`) |
| DELETE | `/api/tasks/:taskId/completion?memberId=` | 완료 취소 |
