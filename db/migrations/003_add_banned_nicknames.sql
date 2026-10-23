-- 추방된 닉네임 목록. 새 테이블만 추가하며 기존 데이터는 건드리지 않는다. 재실행해도 안전.
-- member_id 는 추방 당시 멤버 id (FK 아님). 추방된 사람의 화면이 "추방되었습니다"를 구분해서 보여 주는 데 쓴다.
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
  ON banned_nicknames (study_id, member_id)
