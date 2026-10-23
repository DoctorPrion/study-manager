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

export interface TaskList {
  tasks: Task[];
  totalMembers: number;
}
