import { useState, useEffect, useCallback } from 'react';
import { ListTodo, Search } from 'lucide-react';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useDebounce } from '@/hooks/useDebounce';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Task, TaskInsert, Priority } from '@/types';

type FilterType = 'all' | 'active' | 'completed' | 'high-priority' | 'due-today' | 'overdue';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'high-priority', label: 'High priority' },
  { key: 'due-today', label: 'Due today' },
  { key: 'overdue', label: 'Overdue' },
];

export function AllTasksPage() {
  const { projects } = useProjects();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tasks').select('*').is('parent_task_id', null);

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

    if (debouncedSearch.trim()) {
      query = query.or(`title.ilike.%${debouncedSearch.trim()}%,description.ilike.%${debouncedSearch.trim()}%`);
    }

    query = query
      .order('completed', { ascending: true })
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('Error loading tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [filter, debouncedSearch]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Load subtasks
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
    setAllSubtasks((prev) => [...prev, data]);
    return data;
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setEditModalOpen(true);
  };

  const allTasks = [...tasks, ...allSubtasks];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-1">
          <ListTodo size={16} />
          <span>All Tasks</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">All Tasks</h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          type="search"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-accent-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            )}
          >
            {f.label}
          </button>
        ))}
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
        showProject
        emptyState={
          <EmptyState
            icon={<ListTodo size={28} />}
            title={search ? 'No tasks found.' : 'No tasks yet.'}
            description={search ? 'Try a different search term.' : 'Add your first task to get started.'}
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
