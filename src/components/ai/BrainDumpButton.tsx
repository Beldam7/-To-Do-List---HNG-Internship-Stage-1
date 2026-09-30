import { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { brainDump, AIError } from '@/lib/ai/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toast';
import { cn, getPriorityLabel, getPriorityColor } from '@/lib/utils';
import type { BrainDumpTask } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

interface BrainDumpButtonProps {
  onTasksAdded?: () => void;
}

export function BrainDumpButton({ onTasksAdded }: BrainDumpButtonProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<BrainDumpTask[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [adding, setAdding] = useState(false);

  const timezone = profile?.timezone || 'UTC';

  const handleProcess = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await brainDump(text.trim(), timezone);
      setTasks(result);
      setShowResults(true);
    } catch (err) {
      if (err instanceof AIError) {
        showToast('AI is temporarily unavailable. Please try again later.', 'info');
      }
    }
    setLoading(false);
  };

  const toggleTask = (index: number) => {
    setTasks((prev) =>
      prev.map((t, i) => ({ ...t, selected: i === index ? !t.selected : t.selected }))
    );
  };

  const handleAddAll = async () => {
    const selected = tasks.filter((t) => t.selected);
    if (selected.length === 0) return;
    setAdding(true);
    try {
      const inserts = selected.map((t) => ({
        title: t.title,
        due_date: t.dueDate,
        due_time: t.dueTime,
        priority: t.priority,
        completed: false,
      }));
      const { error } = await supabase.from('tasks').insert(inserts);
      if (error) {
        showToast("We couldn't save those tasks. Please try again.", 'error');
      } else {
        showToast(`${selected.length} task${selected.length > 1 ? 's' : ''} added`, 'success');
        handleClose();
        onTasksAdded?.();
      }
    } catch {
      showToast("We couldn't save those tasks. Please try again.", 'error');
    }
    setAdding(false);
  };

  const handleClose = () => {
    setOpen(false);
    setText('');
    setTasks([]);
    setShowResults(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles size={15} /> Brain dump
      </Button>

      <Modal open={open} onClose={handleClose} title="Brain dump" size="md">
        {!showResults ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Type whatever's on your mind. Focus AI will extract individual tasks for you.
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="I need to finish the structural drawing, call my supervisor, apply for the engineering job, buy cement and remember my friend's birthday next Saturday."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleProcess} loading={loading} disabled={!text.trim()}>
                {!loading && <Sparkles size={15} />} Extract tasks
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review the extracted tasks. Uncheck any you don't want to add.
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {tasks.map((task, i) => (
                <button
                  key={i}
                  onClick={() => toggleTask(i)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                      task.selected
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {task.selected && <Check size={12} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.dueDate && (
                        <span className="text-xs text-slate-400">{task.dueDate}</span>
                      )}
                      <span className={cn('text-xs', getPriorityColor(task.priority).text)}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" onClick={() => { setShowResults(false); setTasks([]); }}>
                <X size={15} /> Start over
              </Button>
              <Button onClick={handleAddAll} loading={adding}>
                Add all
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
