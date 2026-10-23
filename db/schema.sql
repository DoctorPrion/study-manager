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
