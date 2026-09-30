import { useState } from 'react';
import { Sparkles, Loader2, Play, RefreshCw, Clock, Flag, Calendar } from 'lucide-react';
import { whatNext, AIError } from '@/lib/ai/client';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { formatDuration } from '@/lib/utils';
import type { Task, NextTaskSuggestion } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface NextTaskButtonProps {
  tasks: Task[];
  onStartTask?: (task: Task) => void;
}

export function NextTaskButton({ tasks, onStartTask }: NextTaskButtonProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<NextTaskSuggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const timezone = profile?.timezone || 'UTC';

  const handleSuggest = async () => {
    setLoading(true);
    setSuggestion(null);
    setDismissed(false);
    try {
      const result = await whatNext(tasks, timezone);
      setSuggestion(result);
    } catch (err) {
      if (err instanceof AIError) {
        showToast('AI is temporarily unavailable. Please try again later.', 'info');
      }
    }
    setLoading(false);
  };

  const suggestedTask = suggestion?.taskId
    ? tasks.find((t) => t.id === suggestion.taskId)
    : null;

  const handleStart = () => {
    if (suggestedTask && onStartTask) {
      onStartTask(suggestedTask);
    }
    setSuggestion(null);
    setDismissed(true);
  };

  if (dismissed && !suggestion) {
    return (
      <Button variant="outline" size="sm" onClick={handleSuggest}>
        <Sparkles size={15} /> What should I do next?
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        <span>Finding your next task…</span>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <Button variant="outline" size="sm" onClick={handleSuggest}>
        <Sparkles size={15} /> What should I do next?
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-accent-200 dark:border-accent-900/50 bg-accent-50/50 dark:bg-accent-950/20 p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white">
          <Sparkles size={20} />
        </div>
        <div className="flex-1 min-w-0">
          {suggestedTask ? (
            <>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Start "{suggestedTask.title}"
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{suggestion.reason}</p>
              {suggestion.estimatedMinutes && (
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {formatDuration(suggestion.estimatedMinutes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Flag size={12} /> {suggestedTask.priority === 1 ? 'High' : suggestedTask.priority === 2 ? 'Medium' : 'Low'}
                  </span>
                  {suggestedTask.due_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> {suggestedTask.due_date}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleStart}>
                  <Play size={14} /> Start task
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSuggest}>
                  <RefreshCw size={14} /> Choose another
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                You're all caught up!
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{suggestion.reason}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
