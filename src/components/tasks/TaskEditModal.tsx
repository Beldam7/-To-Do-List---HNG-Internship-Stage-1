import { useState, useEffect, type FormEvent } from 'react';
import { Calendar, Clock, Flag, FolderKanban, FileText, Trash2, Copy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Task, Priority, Project, TaskInsert } from '@/types';
import { getPriorityLabel, cn } from '@/lib/utils';

interface TaskEditModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  projects: Project[];
  onSave: (id: string, updates: Partial<TaskInsert>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (task: Task) => Promise<void>;
}

export function TaskEditModal({
  open,
  onClose,
  task,
  projects,
  onSave,
  onDelete,
  onDuplicate,
}: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(2);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [projectId, setProjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date || '');
      setDueTime(task.due_time || '');
      setEstimatedMinutes(task.estimated_minutes?.toString() || '');
      setProjectId(task.project_id || '');
    }
  }, [task]);

  if (!task) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    const updates: Partial<TaskInsert> = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      due_time: dueTime || null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      project_id: projectId || null,
    };
    const success = await onSave(task.id, updates);
    setSaving(false);
    if (success) onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    await onDelete(task.id);
    setDeleting(false);
    onClose();
  };

  const handleDuplicate = async () => {
    if (!task) return;
    await onDuplicate(task);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit task" size="md">
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <Textarea
          label="Notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add details…"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Flag size={14} className="inline mr-1.5" />
              Priority
            </label>
            <div className="flex gap-2">
              {([1, 2, 3] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    priority === p
                      ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300'
                      : 'border-slate-300 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400'
                  )}
                >
                  {getPriorityLabel(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <FolderKanban size={14} className="inline mr-1.5" />
              Project
            </label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Calendar size={14} className="inline mr-1.5" />
              Due date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Clock size={14} className="inline mr-1.5" />
              Due time
            </label>
            <Input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        </div>

        <Input
          label="Estimated minutes"
          type="number"
          min="1"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          placeholder="e.g. 30"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleDuplicate} disabled={deleting}>
              <Copy size={15} /> Duplicate
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleDelete} loading={deleting}>
              <Trash2 size={15} /> Delete
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Save changes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
