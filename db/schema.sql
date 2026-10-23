-- 스터디 관리 앱 스키마
CREATE TABLE IF NOT EXISTS studies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  join_code   CHAR(6)      NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id         SERIAL PRIMARY KEY,
  study_id   INT         NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  nickname   VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 같은 스터디 안에서 닉네임 중복 불가 (대소문자 무시)
CREATE UNIQUE INDEX IF NOT EXISTS members_study_nickname_uq
  ON members (study_id, lower(nickname));

-- 스터디장: 처음 입장한 멤버 (members 테이블 생성 후 추가해야 순환 참조를 피할 수 있다)
ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS owner_member_id INT REFERENCES members(id) ON DELETE SET NULL;

-- 멤버 PIN(해시)과 무작위 대입 방지용 잠금 정보. pin_hash NULL = 아직 PIN 미등록(기존 멤버)
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS pin_hash         TEXT,
  ADD COLUMN IF NOT EXISTS pin_failed_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  study_id    INT          NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  due_date    DATE         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_study_due_idx ON tasks (study_id, due_date);

CREATE TABLE IF NOT EXISTS completions (
  member_id    INT         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  task_id      INT         NOT NULL REFERENCES tasks(id)   ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, task_id)
);

-- 추방된 닉네임 (재입장 차단). member_id 는 추방 당시 멤버 id 로 FK 가 아니다.
CREATE TABLE IF NOT EXISTS banned_nicknames (
  id        SERIAL PRIMARY KEY,
  study_id  INT         NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  nickname  VARCHAR(20) NOT NULL,
  member_id INT         NOT NULL,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS banned_nicknames_study_nickname_uq
  ON banned_nicknames (study_id, lower(nickname));
CREATE INDEX IF NOT EXISTS banned_nicknames_study_member_idx
  ON banned_nicknames (study_id, member_id);
