import { useState } from 'react';
import { Sparkles, Loader2, Clock } from 'lucide-react';
import { planDay, AIError } from '@/lib/ai/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { cn, formatTime } from '@/lib/utils';
import type { Task, PlanItem } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

interface PlanDayButtonProps {
  tasks: Task[];
  onPlanned?: () => void;
}

export function PlanDayButton({ tasks, onPlanned }: PlanDayButtonProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanItem[]>([]);

  const timezone = profile?.timezone || 'UTC';

  const handlePlan = async () => {
    setLoading(true);
    try {
      const result = await planDay(tasks, timezone, { start: '09:00', end: '18:00' });
      if (result.length === 0) {
        showToast('No tasks to plan. Add some tasks first!', 'info');
      } else {
        setPlan(result);
      }
    } catch (err) {
      if (err instanceof AIError) {
        showToast('AI is temporarily unavailable. Please try again later.', 'info');
      }
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    // Update due_time for tasks in the plan
    for (const item of plan) {
      if (item.taskId && !item.isBreak) {
        await supabase.from('tasks').update({ due_time: item.startTime }).eq('id', item.taskId);
      }
    }
    showToast('Plan applied to your tasks', 'success');
    setOpen(false);
    setPlan([]);
    onPlanned?.();
  };

  const handleOpen = () => {
    setOpen(true);
    setPlan([]);
    handlePlan();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Sparkles size={15} /> Plan my day
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); setPlan([]); }} title="Your plan" size="md">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-accent-500 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Creating your schedule…</p>
          </div>
        ) : plan.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {plan.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border p-3',
                    item.isBreak
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  )}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock size={16} className="text-slate-400" />
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      <div>{formatTime(item.startTime)}</div>
                      <div className="text-slate-400">{formatTime(item.endTime)}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        item.isBreak
                          ? 'text-slate-400 dark:text-slate-500 italic'
                          : 'font-medium text-slate-900 dark:text-slate-100'
                      )}
                    >
                      {item.isBreak ? 'Break' : item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="ghost" onClick={() => { setPlan([]); handlePlan(); }}>
                Regenerate
              </Button>
              <Button onClick={handleAccept}>Accept plan</Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No plan available. Make sure you have unfinished tasks.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
