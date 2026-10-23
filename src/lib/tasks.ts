export const TASK_SELECT = `
  t.id, t.title, t.description,
  to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
  -- 마감 지남 판정: 서버(UTC)가 아니라 한국 시간(Asia/Seoul) 기준 오늘과 비교
  (t.due_date < (now() AT TIME ZONE 'Asia/Seoul')::date) AS overdue,
  (SELECT count(*)::int FROM completions c WHERE c.task_id = t.id) AS completed_count,
  EXISTS (SELECT 1 FROM completions c WHERE c.task_id = t.id AND c.member_id = $2) AS done_by_me`;

export interface TaskRow {
  id: number;
  title: string;
  description: string;
  due_date: string;
  overdue: boolean;
  completed_count: number;
  done_by_me: boolean;
}

export function toTask(r: TaskRow) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    dueDate: r.due_date,
    overdue: r.overdue,
    completedCount: r.completed_count,
    doneByMe: r.done_by_me,
  };
}
