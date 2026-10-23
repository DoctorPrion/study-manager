export interface Study {
  name: string;
  description: string;
  joinCode: string;
}

export interface MemberProgress {
  id: number;
  nickname: string;
  completedCount: number;
  isOwner: boolean;
}

export interface StudyDetail {
  study: Study;
  members: MemberProgress[];
  totalTasks: number;
  me: { id: number; nickname: string; isOwner: boolean } | null;
  /** me 가 없을 때, 스터디장에게 추방되어서인지 여부 */
  kicked?: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  /** 마감일이 한국 시간(Asia/Seoul) 오늘보다 이전인지 (서버에서 계산) */
  overdue: boolean;
  completedCount: number;
  doneByMe: boolean;
}

/** 누가 어떤 과제를 언제 완료했는지 (펼침 목록용). 과제 목록과 같은 응답에 담아 추가 요청이 없다. */
export interface Completion {
  taskId: number;
  memberId: number;
  /** 완료한 날짜 (한국 시간, YYYY-MM-DD) */
  date: string;
}

export interface TaskList {
  tasks: Task[];
  totalMembers: number;
  completions: Completion[];
}
