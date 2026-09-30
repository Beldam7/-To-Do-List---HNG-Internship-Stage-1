import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'high' | 'medium' | 'low' | 'overdue';
  className?: string;
}

const variantClasses = {
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  high: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  low: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
