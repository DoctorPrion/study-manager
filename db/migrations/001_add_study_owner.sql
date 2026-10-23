-- 스터디장(owner) 추가. 기존 데이터는 지우지 않고 컬럼만 추가한다. 재실행해도 안전.
-- 멤버가 삭제되면 owner 는 NULL 이 된다. (스터디장은 앱에서 나갈 수 없으므로 정상 흐름에선 발생하지 않는다)
ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS owner_member_id INT REFERENCES members(id) ON DELETE SET NULL;

-- 기존 스터디의 스터디장 = 가장 먼저 입장한 멤버 (이미 값이 있는 스터디는 건드리지 않는다)
UPDATE studies s
   SET owner_member_id = (
     SELECT m.id FROM members m
      WHERE m.study_id = s.id
      ORDER BY m.created_at, m.id
      LIMIT 1
   )
 WHERE s.owner_member_id IS NULL
