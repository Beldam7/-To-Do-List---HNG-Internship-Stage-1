import { supabase } from '@/lib/supabase/client';
import type {
  ParsedTask,
  SubtaskSuggestion,
  BrainDumpTask,
  InboxSuggestion,
  PlanItem,
  NextTaskSuggestion,
  Priority,
  Task,
  Project,
} from '@/types';

const AI_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assist`;

export class AIError extends Error {
  constructor(message: string, public readonly code: string = 'ai_error') {
    super(message);
  }
}

// Read the user's stored OpenAI key (if any) from their profile row.
// The key is read once per callAI invocation — lightweight since profiles
// are a single tiny row and Supabase client caches auth state.
async function getUserApiKey(): Promise<string | undefined> {
  const { data } = await supabase
    .from('profiles')
    .select('openai_api_key')
    .maybeSingle();
  const key = (data as { openai_api_key?: string | null } | null)?.openai_api_key;
  return key ?? undefined;
}

async function callAI(action: string, params: Record<string, unknown>): Promise<unknown> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new AIError('Not authenticated', 'auth');

  // Forward the user's own key so the edge function can use it instead of
  // the server-wide key. The edge function validates it before use.
  const userApiKey = await getUserApiKey();

  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ action, userApiKey, ...params }),
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      message = errorBody.error || message;
    } catch {
      // ignore parse error
    }
    const code = response.status === 503 ? 'unavailable' : response.status === 401 ? 'invalid_key' : 'api_error';
    throw new AIError(message, code);
  }

  const json = await response.json();
  return json.data;
}

// ─── Validators ─────────────────────────────────────────────

function clampPriority(value: unknown): Priority {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

function validateParsedTask(data: unknown): ParsedTask {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj.title !== 'string' || !obj.title.trim()) {
    throw new AIError('I couldn\u2019t understand that request. Try describing the task another way.', 'invalid');
  }
  return {
    title: obj.title.trim(),
    description: typeof obj.description === 'string' ? obj.description : null,
    dueDate: typeof obj.dueDate === 'string' && obj.dueDate ? obj.dueDate : null,
    dueTime: typeof obj.dueTime === 'string' && obj.dueTime ? obj.dueTime : null,
    priority: clampPriority(obj.priority),
    estimatedMinutes: typeof obj.estimatedMinutes === 'number' ? obj.estimatedMinutes : null,
  };
}

function validateSubtasks(data: unknown): SubtaskSuggestion[] {
  const obj = data as Record<string, unknown>;
  const subtasks = obj?.subtasks;
  if (!Array.isArray(subtasks)) throw new AIError('Invalid response from AI', 'invalid');
  return subtasks
    .filter((s) => typeof (s as Record<string, unknown>)?.title === 'string')
    .map((s) => ({
      title: ((s as Record<string, unknown>).title as string).trim(),
      selected: true,
    }))
    .filter((s) => s.title.length > 0);
}

function validateBrainDump(data: unknown): BrainDumpTask[] {
  const obj = data as Record<string, unknown>;
  const tasks = obj?.tasks;
  if (!Array.isArray(tasks)) throw new AIError('Invalid response from AI', 'invalid');
  return tasks
    .filter((t) => typeof (t as Record<string, unknown>)?.title === 'string')
    .map((t) => {
      const task = t as Record<string, unknown>;
      return {
        title: (task.title as string).trim(),
        dueDate: typeof task.dueDate === 'string' && task.dueDate ? task.dueDate : null,
        dueTime: typeof task.dueTime === 'string' && task.dueTime ? task.dueTime : null,
        priority: clampPriority(task.priority),
        selected: true,
      };
    })
    .filter((t) => t.title.length > 0);
}

function validateInboxSuggestions(data: unknown): InboxSuggestion[] {
  const obj = data as Record<string, unknown>;
  const suggestions = obj?.suggestions;
  if (!Array.isArray(suggestions)) throw new AIError('Invalid response from AI', 'invalid');
  return suggestions
    .filter((s) => typeof (s as Record<string, unknown>)?.taskId === 'string')
    .map((s) => {
      const sug = s as Record<string, unknown>;
      return {
        taskId: sug.taskId as string,
        taskTitle: (sug.taskTitle as string) || '',
        projectName: typeof sug.projectName === 'string' && sug.projectName ? sug.projectName : null,
        priority: clampPriority(sug.priority),
        dueDate: typeof sug.dueDate === 'string' && sug.dueDate ? sug.dueDate : null,
        estimatedMinutes: typeof sug.estimatedMinutes === 'number' ? sug.estimatedMinutes : null,
        selected: true,
      };
    });
}

function validatePlan(data: unknown): PlanItem[] {
  const obj = data as Record<string, unknown>;
  const plan = obj?.plan;
  if (!Array.isArray(plan)) throw new AIError('Invalid response from AI', 'invalid');
  return plan
    .filter((p) => typeof (p as Record<string, unknown>)?.title === 'string')
    .map((p) => {
      const item = p as Record<string, unknown>;
      return {
        taskId: typeof item.taskId === 'string' && item.taskId ? item.taskId : null,
        title: (item.title as string).trim(),
        startTime: (item.startTime as string) || '09:00',
        endTime: (item.endTime as string) || '09:30',
        isBreak: Boolean(item.isBreak),
        selected: true,
      };
    });
}

function validateNextTask(data: unknown): NextTaskSuggestion {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj.taskId !== 'string') {
    throw new AIError('Invalid response from AI', 'invalid');
  }
  return {
    taskId: obj.taskId,
    reason: typeof obj.reason === 'string' ? obj.reason : '',
    estimatedMinutes: typeof obj.estimatedMinutes === 'number' ? obj.estimatedMinutes : null,
  };
}

// ─── Public API ─────────────────────────────────────────────

export async function parseTask(text: string, timezone: string): Promise<ParsedTask> {
  const data = await callAI('parse-task', {
    text,
    timezone,
    currentDate: new Date().toISOString().split('T')[0],
  });
  return validateParsedTask(data);
}

export async function breakDownTask(
  taskTitle: string,
  taskDescription?: string | null
): Promise<SubtaskSuggestion[]> {
  const data = await callAI('break-down', { taskTitle, taskDescription });
  return validateSubtasks(data);
}

export async function makeActionable(
  taskTitle: string,
  taskDescription?: string | null
): Promise<SubtaskSuggestion[]> {
  const data = await callAI('make-actionable', { taskTitle, taskDescription });
  return validateSubtasks(data);
}

export async function brainDump(text: string, timezone: string): Promise<BrainDumpTask[]> {
  const data = await callAI('brain-dump', {
    text,
    timezone,
    currentDate: new Date().toISOString().split('T')[0],
  });
  return validateBrainDump(data);
}

export async function organizeInbox(
  tasks: Pick<Task, 'id' | 'title' | 'description'>[],
  projects: Pick<Project, 'id' | 'name'>[],
  timezone: string
): Promise<InboxSuggestion[]> {
  const data = await callAI('organize-inbox', {
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, description: t.description })),
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    timezone,
    currentDate: new Date().toISOString().split('T')[0],
  });
  return validateInboxSuggestions(data);
}

export async function planDay(
  tasks: Pick<Task, 'id' | 'title' | 'priority' | 'due_date' | 'due_time' | 'estimated_minutes' | 'completed'>[],
  timezone: string,
  workHours: { start: string; end: string }
): Promise<PlanItem[]> {
  const data = await callAI('plan-day', {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.due_date,
      dueTime: t.due_time,
      estimatedMinutes: t.estimated_minutes,
      completed: t.completed,
    })),
    timezone,
    currentDate: new Date().toISOString().split('T')[0],
    workHours,
  });
  return validatePlan(data);
}

export async function whatNext(
  tasks: Pick<Task, 'id' | 'title' | 'priority' | 'due_date' | 'due_time' | 'estimated_minutes' | 'completed'>[],
  timezone: string
): Promise<NextTaskSuggestion> {
  const data = await callAI('next-task', {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.due_date,
      dueTime: t.due_time,
      estimatedMinutes: t.estimated_minutes,
      completed: t.completed,
    })),
    timezone,
    currentDate: new Date().toISOString().split('T')[0],
  });
  return validateNextTask(data);
}

// Test a key without running a real AI call
export async function testOpenAIKey(key: string): Promise<{ valid: boolean; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new AIError('Not authenticated', 'auth');

  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ action: 'test-key', userApiKey: key }),
  });

  if (!response.ok) {
    return { valid: false, error: `Server error (${response.status})` };
  }
  const json = await response.json();
  return json.data as { valid: boolean; error?: string };
}
