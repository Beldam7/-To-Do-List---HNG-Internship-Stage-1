import { useState, useEffect, useCallback } from 'react';
import { Inbox as InboxIcon } from 'lucide-react';
import { QuickAdd } from '@/components/tasks/QuickAdd';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { BrainDumpButton } from '@/components/ai/BrainDumpButton';
import { OrganizeInboxButton } from '@/components/ai/OrganizeInboxButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/lib/supabase/client';
import type { Task, TaskInsert } from '@/types';

export function InboxPage() {
  const { projects, reload: reloadProjects } = useProjects();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .is('project_id', null)
      .is('parent_task_id', null)
      .order('completed', { ascending: true })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading inbox:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Also load subtasks for inbox tasks
  const [allSubtasks, setAllSubtasks] = useState<Task[]>([]);
  useEffect(() => {
    if (tasks.length === 0) {
      setAllSubtasks([]);
      return;
    }
    const taskIds = tasks.map((t) => t.id);
    supabase
      .from('tasks')
      .select('*')
      .in('parent_task_id', taskIds)
      .then(({ data }) => setAllSubtasks(data || []));
  }, [tasks]);

  const handleToggleComplete = async (task: Task) => {
    const completed = !task.completed;
    const updates = { completed, completed_at: completed ? new Date().toISOString() : null };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t)));
    setAllSubtasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t)));
    await supabase.from('tasks').update(updates).eq('id', task.id);
  };

  const handleSave = async (id: string, updates: Partial<TaskInsert>): Promise<boolean> => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) return false;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    setAllSubtasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    return true;
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return false;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setAllSubtasks((prev) => prev.filter((t) => t.id !== id && t.parent_task_id !== id));
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
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title, parent_task_id: parentId, priority: 2, completed: false })
      .select()
      .single();
    if (error) return null;
    setAllSubtasks((prev) => [...prev, data]);
    return data;
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setEditModalOpen(true);
  };

  const allTasks = [...tasks, ...allSubtasks];
  const activeTasks = tasks.filter((t) => !t.completed);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-1">
          <InboxIcon size={16} />
          <span>Inbox</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Inbox</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Capture now. Organize later.</p>
      </div>

      {/* Quick Add */}
      <div className="mb-6">
        <QuickAdd onTaskCreated={loadTasks} />
      </div>

      {/* AI actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <BrainDumpButton onTasksAdded={loadTasks} />
        {activeTasks.length > 0 && (
          <OrganizeInboxButton
            tasks={activeTasks}
            projects={projects}
            onOrganized={() => { loadTasks(); reloadProjects(); }}
          />
        )}
      </div>

      {/* Tasks */}
      <TaskList
        tasks={tasks}
        allTasks={allTasks}
        projects={projects}
        loading={loading}
        onToggleComplete={handleToggleComplete}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onAddSubtask={handleAddSubtask}
        showProject={false}
        emptyState={
          <EmptyState
            icon={<InboxIcon size={28} />}
            title="Your inbox is empty."
            description="Capture anything that's on your mind."
          />
        }
      />

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
