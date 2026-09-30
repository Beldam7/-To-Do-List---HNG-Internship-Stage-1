export type Priority = 1 | 2 | 3;

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: 'High',
  2: 'Medium',
  3: 'Low',
};

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  timezone: string;
  openai_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  due_time: string | null;
  reminder_at: string | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AIAction {
  id: string;
  user_id: string;
  action_type: string;
  input: unknown;
  output: unknown;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  project?: Pick<Project, 'id' | 'name'> | null;
  subtasks?: Task[];
}

// ─── AI response types ──────────────────────────────────────

export interface ParsedTask {
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  estimatedMinutes: number | null;
}

export interface SubtaskSuggestion {
  title: string;
  selected?: boolean;
}

export interface BrainDumpTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  selected?: boolean;
}

export interface InboxSuggestion {
  taskId: string;
  taskTitle: string;
  projectName: string | null;
  priority: Priority;
  dueDate: string | null;
  estimatedMinutes: number | null;
  selected?: boolean;
}

export interface PlanItem {
  taskId: string | null;
  title: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  selected?: boolean;
}

export interface NextTaskSuggestion {
  taskId: string;
  reason: string;
  estimatedMinutes: number | null;
}

// ─── Database insert types ──────────────────────────────────

export type TaskInsert = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  title: string;
};

export type ProjectInsert = {
  name: string;
};

// ─── Auth types ─────────────────────────────────────────────

export type Page =
  | 'today'
  | 'inbox'
  | 'all-tasks'
  | 'projects'
  | 'notes'
  | 'settings';

export type AuthView =
  | 'login'
  | 'signup'
  | 'onboarding'
  | 'forgot-password';
