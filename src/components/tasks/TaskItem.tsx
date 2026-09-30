import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit, Copy, Trash2, FolderKanban, ChevronRight, ChevronDown } from 'lucide-react';
import { cn, formatDueDate, formatDuration, getPriorityColor, getPriorityIcon, isOverdue, isDueToday } from '@/lib/utils';
import type { Task, Project } from '@/types';
import { SubtaskList } from '@/components/tasks/SubtaskList';

interface TaskItemProps {
  task: Task;
  project?: Project;
  subtasks: Task[];
  allTasks: Task[];
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (task: Task) => Promise<void>;
  onAddSubtask: (parentId: string, title: string) => Promise<Task | null>;
  showProject?: boolean;
  children?: React.ReactNode;
}

export function TaskItem({
  task,
  project,
  subtasks,
  allTasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onAddSubtask,
  showProject = true,
  children,
}: TaskItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const priorityColor = getPriorityColor(task.priority);
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);
  const hasSubtasks = subtasks.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <div className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-3 transition-all hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(task)}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
            task.completed
              ? 'border-accent-500 bg-accent-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-accent-400'
          )}
          aria-label={task.completed ? 'Mark as not done' : 'Mark as done'}
        >
          {task.completed && (
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={() => onEdit(task)} role="button" tabIndex={-1}>
          <div className="flex items-start gap-2">
            <span className={cn('text-sm shrink-0 mt-0.5', priorityColor.text)} aria-hidden="true">
              {getPriorityIcon(task.priority)}
            </span>
            <p
              className={cn(
                'text-sm font-medium leading-snug',
                task.completed
                  ? 'text-slate-400 line-through dark:text-slate-600'
                  : 'text-slate-900 dark:text-slate-100'
              )}
            >
              {task.title}
            </p>
          </div>

          {/* Metadata */}
          {(task.due_date || task.estimated_minutes || (showProject && project) || hasSubtasks) && (
            <div className="mt-1.5 ml-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {task.due_date && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400',
                    dueToday && !task.completed && 'text-accent-600 dark:text-accent-400 font-medium'
                  )}
                >
                  {formatDueDate(task.due_date, task.due_time)}
                </span>
              )}
              {task.estimated_minutes && (
                <>
                  {(task.due_date) && <span className="text-slate-300 dark:text-slate-600">·</span>}
                  <span className="text-slate-500 dark:text-slate-400">{formatDuration(task.estimated_minutes)}</span>
                </>
              )}
              {showProject && project && (
                <>
                  {(task.due_date || task.estimated_minutes) && <span className="text-slate-300 dark:text-slate-600">·</span>}
                <span className="text-slate-500 dark:text-slate-400 truncate">{project.name}</span>
              </>
              )}
              {hasSubtasks && (
                <>
                  {(task.due_date || task.estimated_minutes || (showProject && project)) && <span className="text-slate-300 dark:text-slate-600">·</span>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                    className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {completedSubtasks}/{subtasks.length} subtasks
                  </button>
                </>
              )}
            </div>
          )}

          {/* AI actions slot */}
          {children && <div className="mt-2 ml-4" onClick={(e) => e.stopPropagation()}>{children}</div>}
        </div>

        {/* Actions menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-all"
            aria-label="Task actions"
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 animate-fade-in">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(task); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Edit size={15} /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(task); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Copy size={15} /> Duplicate
              </button>
              <button
                onClick={async (e) => { e.stopPropagation(); setMenuOpen(false); await onDelete(task.id); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {hasSubtasks && expanded && (
        <SubtaskList
          task={task}
          subtasks={subtasks}
          onAddSubtask={onAddSubtask}
          onToggleComplete={onToggleComplete}
          onEditTask={onEdit}
        />
      )}
    </div>
  );
}
