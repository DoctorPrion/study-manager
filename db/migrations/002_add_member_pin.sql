-- 멤버 PIN 추가. 기존 데이터는 지우지 않고 컬럼만 추가한다. 재실행해도 안전.
-- pin_hash 가 NULL 인 기존 멤버는 다음 입장 때 입력한 PIN 이 그 멤버의 PIN 으로 등록된다.
-- pin_failed_count / pin_locked_until 은 PIN 무작위 대입 방지(5회 실패 시 15분 잠금)용이다.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS pin_hash         TEXT,
  ADD COLUMN IF NOT EXISTS pin_failed_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ
