import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Task, TaskInsert, Priority, Project } from '@/types';

interface UseTasksOptions {
  projectId?: string | null;
  filter?: 'all' | 'active' | 'completed' | 'high-priority' | 'due-today' | 'overdue';
  searchQuery?: string;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { projectId, filter = 'all', searchQuery = '' } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tasks').select('*');

    if (projectId === null) {
      query = query.is('project_id', null);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (filter === 'active') {
      query = query.eq('completed', false);
    } else if (filter === 'completed') {
      query = query.eq('completed', true);
    } else if (filter === 'high-priority') {
      query = query.eq('priority', 1).eq('completed', false);
    } else if (filter === 'due-today') {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('due_date', today).eq('completed', false);
    } else if (filter === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today).eq('completed', false);
    }

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%`);
    }

    query = query.order('completed', { ascending: true }).order('priority', { ascending: true }).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
    } else {
      setTasks(data || []);
      setError(null);
    }
    setLoading(false);
  }, [projectId, filter, searchQuery]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = useCallback(async (input: TaskInsert): Promise<Task | null> => {
    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert(input)
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return null;
    }
    setTasks((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<TaskInsert>): Promise<boolean> => {
    const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    return true;
  }, []);

  const toggleComplete = useCallback(async (task: Task): Promise<void> => {
    const completed = !task.completed;
    const updates: Partial<Task> = {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t)));

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    if (updateError) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed, completed_at: task.completed_at } : t))
      );
      setError(updateError.message);
    }
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    return true;
  }, []);

  const duplicateTask = useCallback(async (task: Task): Promise<Task | null> => {
    const { id, created_at, updated_at, completed_at, ...rest } = task;
    const newTask: TaskInsert = {
      ...rest,
      title: `${task.title} (copy)`,
      completed: false,
      completed_at: null,
    };
    return createTask(newTask);
  }, [createTask]);

  const changePriority = useCallback(async (id: string, priority: Priority): Promise<void> => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority } : t)));
    const { error: updateError } = await supabase.from('tasks').update({ priority }).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority: t.priority } : t)));
    }
  }, []);

  const addSubtask = useCallback(
    async (parentId: string, title: string): Promise<Task | null> => {
      const parent = tasks.find((t) => t.id === parentId);
      const newTask: TaskInsert = {
        title,
        parent_task_id: parentId,
        project_id: parent?.project_id || null,
        priority: 2,
        completed: false,
      };
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();
      if (insertError) {
        setError(insertError.message);
        return null;
      }
      setTasks((prev) => [...prev, data]);
      return data;
    },
    [tasks]
  );

  const moveToProject = useCallback(async (id: string, projectId: string | null): Promise<void> => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, project_id: projectId } : t)));
    const { error: updateError } = await supabase.from('tasks').update({ project_id: projectId }).eq('id', id);
    if (updateError) {
      setError(updateError.message);
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    duplicateTask,
    changePriority,
    addSubtask,
    moveToProject,
    reload: loadTasks,
  };
}

// Helper to fetch project info for tasks
export function useProjectMap(projects: Project[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of projects) {
    map.set(p.id, p.name);
  }
  return map;
}
