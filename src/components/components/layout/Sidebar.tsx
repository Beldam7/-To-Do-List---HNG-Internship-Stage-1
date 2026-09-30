import { Sun, Inbox, ListTodo, FolderKanban, StickyNote, Settings, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, cn } from '@/lib/utils';
import type { Page } from '@/types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  onClose?: () => void;
}

const navItems: { page: Page; label: string; icon: typeof Sun }[] = [
  { page: 'today', label: 'Today', icon: Sun },
  { page: 'inbox', label: 'Inbox', icon: Inbox },
  { page: 'all-tasks', label: 'All Tasks', icon: ListTodo },
  { page: 'projects', label: 'Projects', icon: FolderKanban },
  { page: 'notes', label: 'Notes', icon: StickyNote },
  { page: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, onSignOut, onClose }: SidebarProps) {
  const { profile, user } = useAuth();
  const displayName = profile?.name || 'User';

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-600 text-white">
          <Zap size={20} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">Focus AI</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight">Get things done</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => {
              onNavigate(page);
              onClose?.();
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              currentPage === page
                ? 'bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* User profile + logout */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 shrink-0">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 text-sm font-semibold shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {profile?.name || 'New user'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
