import { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { organizeInbox, AIError } from '@/lib/ai/client';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { cn, getPriorityLabel, getPriorityColor, formatDueDate, formatDuration } from '@/lib/utils';
import type { Task, Project, InboxSuggestion } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

interface OrganizeInboxButtonProps {
  tasks: Task[];
  projects: Project[];
  onOrganized?: () => void;
}

export function OrganizeInboxButton({ tasks, projects, onOrganized }: OrganizeInboxButtonProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<InboxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [applying, setApplying] = useState(false);

  const timezone = profile?.timezone || 'UTC';

  const handleOrganize = async () => {
    setLoading(true);
    try {
      const result = await organizeInbox(tasks, projects, timezone);
      if (result.length === 0) {
        showToast('No suggestions available. Try adding more tasks first.', 'info');
      } else {
        setSuggestions(result);
        setShowSuggestions(true);
      }
    } catch (err) {
      if (err instanceof AIError) {
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

  const handleApply = async () => {
    const selected = suggestions.filter((s) => s.selected);
    if (selected.length === 0) return;
    setApplying(true);
    try {
      // Create any new projects first
      const existingProjectNames = new Set(projects.map((p) => p.name));
      const newProjectNames = selected
        .map((s) => s.projectName)
        .filter((n): n is string => n !== null && !existingProjectNames.has(n));
      const uniqueNewNames = [...new Set(newProjectNames)];

      const projectIdMap = new Map<string, string>();
      for (const name of uniqueNewNames) {
        const { data, error } = await supabase.from('projects').insert({ name }).select().single();
        if (!error && data) {
          projectIdMap.set(name, data.id);
        }
      }
      // Map existing projects
      for (const p of projects) {
        projectIdMap.set(p.name, p.id);
      }

      // Update each task
      for (const sug of selected) {
        const updates: Record<string, unknown> = {
          priority: sug.priority,
          due_date: sug.dueDate,
          estimated_minutes: sug.estimatedMinutes,
        };
        if (sug.projectName) {
          const projId = projectIdMap.get(sug.projectName);
          if (projId) updates.project_id = projId;
        }
        await supabase.from('tasks').update(updates).eq('id', sug.taskId);
      }

      showToast(`${selected.length} task${selected.length > 1 ? 's' : ''} organized`, 'success');
      setShowSuggestions(false);
      setSuggestions([]);
      onOrganized?.();
    } catch {
      showToast("We couldn't apply those changes. Please try again.", 'error');
    }
    setApplying(false);
  };

  if (showSuggestions) {
    return (
      <div className="rounded-xl border border-accent-200 dark:border-accent-900/50 bg-accent-50/50 dark:bg-accent-950/20 p-4 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Suggested organization</p>
          <button
            onClick={() => { setShowSuggestions(false); setSuggestions([]); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => toggleSuggestion(i)}
              className="flex w-full items-start gap-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                  sug.selected
                    ? 'border-accent-500 bg-accent-500 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                )}
              >
                {sug.selected && <Check size={12} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{sug.taskTitle}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {sug.projectName && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-slate-400">Project:</span> {sug.projectName}
                    </span>
                  )}
                  <span className={cn('inline-flex items-center gap-1', getPriorityColor(sug.priority).text)}>
                    <span className="text-slate-400">Priority:</span> {getPriorityLabel(sug.priority)}
                  </span>
                  {sug.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-slate-400">Due:</span> {formatDueDate(sug.dueDate, null)}
                    </span>
                  )}
                  {sug.estimatedMinutes && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-slate-400">Time:</span> {formatDuration(sug.estimatedMinutes)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setShowSuggestions(false); setSuggestions([]); }}>
            Cancel
          </Button>
          <Button onClick={handleApply} loading={applying}>
            Apply selected
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleOrganize} loading={loading} disabled={tasks.length === 0}>
      {!loading && <Sparkles size={15} />} {loading ? 'Organizing your tasks…' : '✨ Organize Inbox'}
    </Button>
  );
}
