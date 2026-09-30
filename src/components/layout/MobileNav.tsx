import { Menu, Sun, Inbox, ListTodo, FolderKanban, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Page } from '@/types';

interface MobileNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenMenu: () => void;
}

const bottomNavItems: { page: Page; label: string; icon: typeof Sun }[] = [
  { page: 'today', label: 'Today', icon: Sun },
  { page: 'inbox', label: 'Inbox', icon: Inbox },
  { page: 'all-tasks', label: 'Tasks', icon: ListTodo },
  { page: 'notes', label: 'Notes', icon: StickyNote },
  { page: 'projects', label: 'Projects', icon: FolderKanban },
];

export function MobileNav({ currentPage, onNavigate, onOpenMenu }: MobileNavProps) {
  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 lg:hidden">
        <button
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <span className="text-base font-bold text-slate-900 dark:text-slate-100">Focus AI</span>
        <div className="w-10" />
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 lg:hidden pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              currentPage === page
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-slate-400 dark:text-slate-500'
            )}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
