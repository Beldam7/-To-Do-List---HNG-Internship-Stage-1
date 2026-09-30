import { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Plus, Trash2, Edit2, FolderPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { QuickAdd } from '@/components/tasks/QuickAdd';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';
import type { Task, TaskInsert, Project } from '@/types';

export function ProjectsPage() {
  const { projects, loading: projectsLoading, createProject, renameProject, deleteProject, reload: reloadProjects } = useProjects();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allSubtasks, setAllSubtasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadTasks = useCallback(async (projectId: string | null) => {
    setLoadingTasks(true);
    if (projectId) {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('completed', { ascending: true })
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });
      const topTasks = (data || []).filter((t) => !t.parent_task_id);
      setTasks(topTasks);
      // Load subtasks
      if (topTasks.length > 0) {
        const { data: subs } = await supabase
          .from('tasks')
          .select('*')
          .in('parent_task_id', topTasks.map((t) => t.id));
        setAllSubtasks(subs || []);
      } else {
        setAllSubtasks([]);
      }
    } else {
      setTasks([]);
      setAllSubtasks([]);
    }
    setLoadingTasks(false);
  }, []);

  useEffect(() => {
    loadTasks(selectedProject?.id || null);
  }, [selectedProject, loadTasks]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createProject({ name: newName.trim() });
    setCreating(false);
    if (result) {
      showToast('Project created', 'success');
      setNewName('');
      setShowCreate(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProject || !editName.trim()) return;
    const success = await renameProject(editingProject.id, editName.trim());
    if (success) {
      showToast('Project renamed', 'success');
      setShowEdit(false);
      setEditingProject(null);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"? Tasks in this project will be moved to your inbox.`)) return;
    const success = await deleteProject(project.id);
    if (success) {
      showToast('Project deleted', 'success');
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
      }
    }
  };

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

  // Project detail view
  if (selectedProject) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <button
          onClick={() => setSelectedProject(null)}
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ChevronRight size={16} className="rotate-180" /> All projects
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-1">
              <FolderKanban size={16} />
              <span>Project</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{selectedProject.name}</h1>
          </div>
          <button
            onClick={() => handleEditProject(selectedProject)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Edit project"
          >
            <Edit2 size={18} />
          </button>
        </div>

        <div className="mb-6">
          <QuickAdd onTaskCreated={() => loadTasks(selectedProject.id)} projectId={selectedProject.id} />
        </div>

        <TaskList
          tasks={tasks}
          allTasks={allTasks}
          projects={projects}
          loading={loadingTasks}
          onToggleComplete={handleToggleComplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onAddSubtask={handleAddSubtask}
          showProject={false}
          emptyState={
            <EmptyState
              icon={<FolderKanban size={28} />}
              title="No tasks in this project."
              description="Add a task above to get started."
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

        {/* Edit project modal */}
        <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Rename project" size="sm">
          <div className="space-y-4">
            <Input
              label="Project name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
            />
            <div className="flex justify-between">
              <Button variant="danger" onClick={() => { handleDeleteProject(selectedProject); setShowEdit(false); }}>
                <Trash2 size={15} /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit}>Save</Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Project list view
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-1">
            <FolderKanban size={16} />
            <span>Projects</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New
        </Button>
      </div>

      {projectsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-accent-500 border-t-transparent rounded-full" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="No projects yet."
          description="Create one to organize related tasks."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <FolderPlus size={16} /> Create project
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 transition-all hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
              )}
              onClick={() => setSelectedProject(project)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400">
                <FolderKanban size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</p>
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
            </div>
          ))}
        </div>
      )}

      {/* Create project modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setNewName(''); }} title="New project" size="sm">
        <div className="space-y-4">
          <Input
            label="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Work, Personal, Job Search"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); }}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!newName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
