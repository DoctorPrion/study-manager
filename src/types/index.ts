export interface Study {
  name: string;
  description: string;
  joinCode: string;
}

export interface MemberProgress {
  id: number;
  nickname: string;
  completedCount: number;
}

export interface StudyDetail {
  study: Study;
  members: MemberProgress[];
  totalTasks: number;
  me: { id: number; nickname: string } | null;
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
