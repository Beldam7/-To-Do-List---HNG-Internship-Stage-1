import type { Priority } from '@/types';
import { PRIORITY_LABELS } from '@/types';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Date utilities ─────────────────────────────────────────

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatToday(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function todayISO(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function formatDueDate(dueDate: string | null, dueTime: string | null): string {
  if (!dueDate) return '';
  const date = new Date(dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  let label: string;
  if (dateOnly.getTime() === today.getTime()) {
    label = 'Today';
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    label = 'Tomorrow';
  } else if (dateOnly.getTime() < today.getTime()) {
    const diffDays = Math.round((today.getTime() - dateOnly.getTime()) / 86400000);
    if (diffDays === 1) label = 'Yesterday';
    else label = `${diffDays}d overdue`;
  } else {
    label = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (date.getFullYear() !== today.getFullYear()) {
      label = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  if (dueTime) {
    const timeLabel = formatTime(dueTime);
    return `${label} · ${timeLabel}`;
  }
  return label;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function isOverdue(task: { due_date: string | null; completed: boolean }): boolean {
  if (!task.due_date || task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  return due < today;
}

export function isDueToday(task: { due_date: string | null }): boolean {
  if (!task.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  return due.getTime() === today.getTime();
}

// ─── Priority utilities ─────────────────────────────────────

export function getPriorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority] ?? 'Medium';
}

export function getPriorityColor(priority: Priority): {
  dot: string;
  text: string;
  bg: string;
  border: string;
} {
  switch (priority) {
    case 1:
      return {
        dot: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950/40',
        border: 'border-red-200 dark:border-red-900',
      };
    case 2:
      return {
        dot: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-900',
      };
    case 3:
      return {
        dot: 'bg-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-900',
      };
    default:
      return {
        dot: 'bg-slate-400',
        text: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-800/40',
        border: 'border-slate-200 dark:border-slate-700',
      };
  }
}

export function getPriorityIcon(priority: Priority): string {
  switch (priority) {
    case 1:
      return '▲';
    case 2:
      return '◆';
    case 3:
      return '▼';
    default:
      return '◆';
  }
}

// ─── Misc utilities ─────────────────────────────────────────

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
