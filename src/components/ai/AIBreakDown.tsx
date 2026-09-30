import { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { breakDownTask, makeActionable, AIError } from '@/lib/ai/client';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { Task, SubtaskSuggestion } from '@/types';

interface AIBreakDownProps {
  task: Task;
  mode: 'break-down' | 'make-actionable';
  onAddSubtasks: (parentId: string, subtasks: string[]) => Promise<void>;
}

export function AIBreakDown({ task, mode, onAddSubtasks }: AIBreakDownProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [adding, setAdding] = useState(false);

  const label = mode === 'break-down' ? 'Break down' : 'Make actionable';

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = mode === 'break-down'
        ? await breakDownTask(task.title, task.description)
        : await makeActionable(task.title, task.description);
      setSuggestions(result);
      setShowSuggestions(true);
    } catch (err) {
      if (err instanceof AIError && err.code === 'unavailable') {
        showToast('AI is temporarily unavailable. Please try again later.', 'info');
      } else {
        showToast('AI is temporarily unavailable. Please try again later.', 'info');
      }
    }
    setLoading(false);
  };

  const toggleSuggestion = (index: number) => {
    setSuggestions((prev) =>
      prev.map((s, i) => ({ ...s, selected: i === index ? !s.selected : s.selected }))
    );
  };

  const handleAddSelected = async () => {
    const selected = suggestions.filter((s) => s.selected).map((s) => s.title);
    if (selected.length === 0) return;
    setAdding(true);
    await onAddSubtasks(task.id, selected);
    setAdding(false);
    setShowSuggestions(false);
    setSuggestions([]);
    showToast(`${selected.length} subtask${selected.length > 1 ? 's' : ''} added`, 'success');
  };

  if (showSuggestions) {
    return (
      <div className="rounded-lg border border-accent-200 dark:border-accent-900/50 bg-accent-50/50 dark:bg-accent-950/20 p-3 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {mode === 'break-down' ? 'Suggested breakdown' : 'Suggested actions'}
          </p>
          <button
            onClick={() => { setShowSuggestions(false); setSuggestions([]); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => toggleSuggestion(i)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                  s.selected
                    ? 'border-accent-500 bg-accent-500 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                )}
              >
                {s.selected && <Check size={10} />}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={handleAddSelected} loading={adding}>
            Add selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowSuggestions(false); setSuggestions([]); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
      {loading ? 'Thinking…' : `✨ ${label}`}
    </button>
  );
}
