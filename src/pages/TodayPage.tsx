import { useState, useEffect, useCallback } from 'react';
import { Sun, CheckCircle2 } from 'lucide-react';
import { QuickAdd } from '@/components/tasks/QuickAdd';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { NextTaskButton } from '@/components/ai/NextTaskButton';
import { PlanDayButton } from '@/components/ai/PlanDayButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/lib/supabase/client';
import { getGreeting, formatToday, todayISO, isDueToday, isOverdue } from '@/lib/utils';
import type { Task, TaskInsert, Project } from '@/types';

export function TodayPage() {
  const { profile } = useAuth();
  const { projects, reload: reloadProjects } = useProjects();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const now = new Date();
  const greeting = getGreeting(now);
  const dateLabel = formatToday(now);
  const today = todayISO(now);
  const firstName = profile?.name?.trim()?.split(' ')[0] || '';

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('completed', { ascending: true })
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Today's tasks: due today or overdue, not completed
  const todayTasks = tasks.filter(
    (t) => !t.parent_task_id && !t.completed && (isDueToday(t) || isOverdue(t))
  );
  // Recently completed today
  const completedToday = tasks.filter(
    (t) => !t.parent_task_id && t.completed && t.completed_at && t.completed_at.startsWith(today)
  );

  const handleToggleComplete = async (task: Task) => {
    const completed = !task.completed;
    const updates = { completed, completed_at: completed ? new Date().toISOString() : null };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t)));
    await supabase.from('tasks').update(updates).eq('id', task.id);
  };

  const handleSave = async (id: string, updates: Partial<TaskInsert>): Promise<boolean> => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) return false;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    return true;
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return false;
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parent_task_id !== id));
    return true;
  };

  const handleDuplicate = async (task: Task): Promise<void> => {
    const { id, created_at, updated_at, completed_at, ...rest } = task;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...rest, title: `${task.title} (copy)`, completed: false, completed_at: null })
      .select()
      .single();
    if (!error && data) {
      setTasks((prev) => [data, ...prev]);
    }
  };

  const handleAddSubtask = async (parentId: string, title: string): Promise<Task | null> => {
    const parent = tasks.find((t) => t.id === parentId);
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        parent_task_id: parentId,
        project_id: parent?.project_id || null,
        priority: 2,
        completed: false,
      })
      .select()
      .single();
    if (error) return null;
    setTasks((prev) => [...prev, data]);
    return data;
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setEditModalOpen(true);
  };

  const handleStartTask = (task: Task) => {
    handleEdit(task);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-1">
          <Sun size={16} />
          <span>{dateLabel}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Focus on what matters.</p>
      </div>

      {/* Quick Add */}
      <div className="mb-6">
        <QuickAdd onTaskCreated={loadTasks} />
      </div>

      {/* AI Features */}
      <div className="mb-6 flex flex-wrap gap-2">
        <PlanDayButton tasks={tasks.filter((t) => !t.completed && !t.parent_task_id)} onPlanned={loadTasks} />
        <NextTaskButton tasks={tasks.filter((t) => !t.completed && !t.parent_task_id)} onStartTask={handleStartTask} />
      </div>

      {/* Today's tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Today
          </h2>
          {todayTasks.length > 0 && (
            <span className="text-xs text-slate-400">{todayTasks.length} task{todayTasks.length > 1 ? 's' : ''}</span>
          )}
        </div>

        <TaskList
          tasks={todayTasks}
          allTasks={tasks}
          projects={projects}
          loading={loading}
          onToggleComplete={handleToggleComplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onAddSubtask={handleAddSubtask}
          showProject
          emptyState={
            <EmptyState
              icon={<CheckCircle2 size={28} />}
              title="You're clear."
              description="No tasks due today."
            />
          }
          taskActions={(task) => (
            <AIBreakDownWrapper task={task} onAddSubtask={handleAddSubtask} />
          )}
        />
      </div>

      {/* Completed today */}
      {completedToday.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Completed
          </h2>
          <TaskList
            tasks={completedToday}
            allTasks={tasks}
            projects={projects}
            loading={false}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onAddSubtask={handleAddSubtask}
            showProject
          />
        </div>
      )}

      <TaskEditModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingTask(null); }}
        task={editingTask}
        projects={projects}
        onSave={handleSave}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}

// Wrapper to adapt single-subtask add to batch interface for AIBreakDown
import { AIBreakDown } from '@/components/ai/AIBreakDown';

function AIBreakDownWrapper({
  task,
  onAddSubtask,
}: {
  task: Task;
  onAddSubtask: (parentId: string, title: string) => Promise<Task | null>;
}) {
  const handleAddSubtasks = async (parentId: string, subtasks: string[]) => {
    for (const title of subtasks) {
      await onAddSubtask(parentId, title);
    }
  };
  return <AIBreakDown task={task} mode="break-down" onAddSubtasks={handleAddSubtasks} />;
}
