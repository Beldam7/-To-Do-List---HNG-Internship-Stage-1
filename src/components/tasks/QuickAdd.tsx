import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { parseTask, AIError } from '@/lib/ai/client';
import { useAuth } from '@/hooks/useAuth';
import { getPriorityLabel, getPriorityColor, formatDueDate, formatDuration, cn } from '@/lib/utils';
import type { ParsedTask, Priority, TaskInsert } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { showToast } from '@/components/ui/Toast';

interface QuickAddProps {
  onTaskCreated?: () => void;
  projectId?: string | null;
}

export function QuickAdd({ onTaskCreated, projectId = null }: QuickAddProps) {
  const { profile } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [editingParsed, setEditingParsed] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>(2);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const timezone = profile?.timezone || 'UTC';

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setParsed(null);
    try {
      const result = await parseTask(input.trim(), timezone);
      setParsed(result);
      setEditTitle(result.title);
      setEditPriority(result.priority);
    } catch (err) {
      if (err instanceof AIError && err.code === 'unavailable') {
        showToast('AI is temporarily unavailable. Your task can still be added normally.', 'info');
        await addSimpleTask(input.trim());
      } else if (err instanceof AIError && err.code === 'invalid') {
        showToast("I couldn't understand that request. Try describing the task another way.", 'error');
      } else {
        showToast('AI is temporarily unavailable. Your task can still be added normally.', 'info');
        await addSimpleTask(input.trim());
      }
    }
    setLoading(false);
  };

  const addSimpleTask = async (title: string) => {
    const taskInput: TaskInsert = { title, priority: 2, completed: false };
    if (projectId !== null) taskInput.project_id = projectId;
    const { error } = await supabase.from('tasks').insert(taskInput);
    if (error) {
      showToast("We couldn't save that task. Please try again.", 'error');
    } else {
      showToast('Task added', 'success');
      setInput('');
      onTaskCreated?.();
    }
  };

  const confirmAdd = async () => {
    if (!parsed) return;
    setLoading(true);
    const taskInput: TaskInsert = {
      title: editTitle.trim() || parsed.title,
      description: parsed.description,
      due_date: parsed.dueDate,
      due_time: parsed.dueTime,
      priority: editingParsed ? editPriority : parsed.priority,
      estimated_minutes: parsed.estimatedMinutes,
      completed: false,
    };
    if (projectId !== null) taskInput.project_id = projectId;

    const { error } = await supabase.from('tasks').insert(taskInput);
    if (error) {
      showToast("We couldn't save that task. Please try again.", 'error');
    } else {
      showToast('Task added', 'success');
      setInput('');
      setParsed(null);
      setEditingParsed(false);
      onTaskCreated?.();
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasMetadata = parsed && (parsed.dueDate || parsed.dueTime || parsed.estimatedMinutes || parsed.priority !== 2);

  return (
    <div className="w-full">
      {/* Input */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell Focus what you need to do…"
          rows={1}
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-36 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          style={{ minHeight: '52px', maxHeight: '120px' }}
          aria-label="Quick add task"
          disabled={loading}
        />
        <div className="absolute right-2 bottom-2">
          <Button
            size="sm"
            onClick={handleParse}
            loading={loading}
            disabled={!input.trim()}
          >
            {!loading && <Sparkles size={15} />}
            {loading ? 'Thinking…' : 'Add with AI'}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && !parsed && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span>Analyzing your task…</span>
        </div>
      )}

      {/* Confirmation card */}
      {parsed && !loading && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-slide-up">
          {editingParsed ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                autoFocus
              />
              <div className="flex gap-2">
                {([1, 2, 3] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setEditPriority(p)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                      editPriority === p
                        ? getPriorityColor(p).bg + ' ' + getPriorityColor(p).text + ' ' + getPriorityColor(p).border
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {getPriorityLabel(p)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmAdd}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingParsed(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{parsed.title}</p>
                  {hasMetadata && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {parsed.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          {formatDueDate(parsed.dueDate, parsed.dueTime)}
                        </span>
                      )}
                      {parsed.estimatedMinutes && (
                        <>
                          {parsed.dueDate && <span>·</span>}
                          <span>{formatDuration(parsed.estimatedMinutes)}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className={getPriorityColor(parsed.priority).text}>
                        {getPriorityLabel(parsed.priority)} priority
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={confirmAdd}>Add task</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingParsed(true)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => { setParsed(null); setInput(''); }}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
