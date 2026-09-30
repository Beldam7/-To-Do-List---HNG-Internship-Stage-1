import { useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface SubtaskListProps {
  task: Task;
  subtasks: Task[];
  onAddSubtask: (parentId: string, title: string) => Promise<Task | null>;
  onToggleComplete: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

export function SubtaskList({ task, subtasks, onAddSubtask, onToggleComplete, onEditTask }: SubtaskListProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setLoadingAdd(true);
    const result = await onAddSubtask(task.id, newTitle.trim());
    setLoadingAdd(false);
    if (result) {
      setNewTitle('');
      setAdding(false);
    }
  };

  return (
    <div className="ml-7 mt-2 space-y-1">
      {subtasks.map((subtask) => (
        <div
          key={subtask.id}
          className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('button')) {
              onEditTask(subtask);
            }
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(subtask);
            }}
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
              subtask.completed
                ? 'border-accent-500 bg-accent-500 text-white'
                : 'border-slate-300 dark:border-slate-600 hover:border-accent-400'
            )}
            aria-label={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {subtask.completed && (
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span
            className={cn(
              'text-sm flex-1',
              subtask.completed
                ? 'text-slate-400 line-through dark:text-slate-600'
                : 'text-slate-700 dark:text-slate-300'
            )}
          >
            {subtask.title}
          </span>
        </div>
      ))}

      {adding ? (
        <div className="flex items-center gap-2 px-2 py-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
            }}
            placeholder="Subtask title…"
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
            autoFocus
          />
          {loadingAdd ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : (
            <button onClick={handleAdd} className="text-accent-600 hover:text-accent-700" aria-label="Add subtask">
              <Plus size={18} />
            </button>
          )}
          <button onClick={() => { setAdding(false); setNewTitle(''); }} className="text-slate-400 hover:text-slate-600" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
        >
          <Plus size={16} /> Add subtask
        </button>
      )}
    </div>
  );
}
