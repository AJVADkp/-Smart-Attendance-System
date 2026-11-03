'use client';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger-outline' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref
) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-sm hover:shadow-glow-orange hover:brightness-105 active:scale-[0.98]',
    secondary:
      'border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-orange-600 dark:hover:text-orange-400 shadow-xs',
    outline:
      'border border-slate-200 dark:border-zinc-700 bg-transparent text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-zinc-600',
    ghost:
      'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 hover:text-slate-900 dark:hover:text-zinc-100 active:bg-slate-200/60 dark:active:bg-zinc-700',
    'danger-outline':
      'border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700 active:bg-rose-100',
    danger:
      'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm hover:brightness-105',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs min-h-[36px]',
    md: 'px-4.5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
  };

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});
