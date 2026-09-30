import { Loader2 } from 'lucide-react';
import { TaskItem } from '@/components/tasks/TaskItem';
import type { Task, Project } from '@/types';

interface TaskListProps {
  tasks: Task[];
  allTasks: Task[];
  projects: Project[];
  loading: boolean;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (task: Task) => Promise<void>;
  onAddSubtask: (parentId: string, title: string) => Promise<Task | null>;
  showProject?: boolean;
  emptyState?: React.ReactNode;
  taskActions?: (task: Task) => React.ReactNode;
}

export function TaskList({
  tasks,
  allTasks,
  projects,
  loading,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onAddSubtask,
  showProject = true,
  emptyState,
  taskActions,
}: TaskListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return <>{emptyState}</>;
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Filter out subtasks from top-level list (they're shown inside parents)
  const topLevelTasks = tasks.filter((t) => !t.parent_task_id);

  return (
    <div className="space-y-2">
      {topLevelTasks.map((task) => {
        const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
        const project = task.project_id ? projectMap.get(task.project_id) : undefined;
        return (
          <TaskItem
            key={task.id}
            task={task}
            project={project}
            subtasks={subtasks}
            allTasks={allTasks}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onAddSubtask={onAddSubtask}
            showProject={showProject}
          >
            {taskActions?.(task)}
          </TaskItem>
        );
      })}
    </div>
  );
}
