import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type StatTheme = 'orange' | 'blue' | 'emerald' | 'rose' | 'amber' | 'violet';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  progressPercent?: number;
  href?: string;
  className?: string;
  icon?: React.ReactNode;
  theme?: StatTheme;
}

export function StatCard({
  label,
  value,
  subtitle,
  progressPercent,
  href,
  className,
  icon,
  theme = 'orange',
}: StatCardProps) {
  const iconThemeStyles: Record<StatTheme, string> = {
    orange: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs',
    blue: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xs',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs',
    rose: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xs',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs',
    violet: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs',
  };

  const progressThemeStyles: Record<StatTheme, string> = {
    orange: 'bg-gradient-to-r from-orange-500 to-amber-500',
    blue: 'bg-gradient-to-r from-sky-400 to-blue-600',
    emerald: 'bg-gradient-to-r from-emerald-400 to-teal-600',
    rose: 'bg-gradient-to-r from-rose-400 to-red-600',
    amber: 'bg-gradient-to-r from-amber-400 to-orange-500',
    violet: 'bg-gradient-to-r from-indigo-400 to-purple-600',
  };

  const hoverBorderStyles: Record<StatTheme, string> = {
    orange: 'hover:border-orange-300',
    blue: 'hover:border-sky-300',
    emerald: 'hover:border-emerald-300',
    rose: 'hover:border-rose-300',
    amber: 'hover:border-amber-300',
    violet: 'hover:border-indigo-300',
  };

  const content = (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm p-6 transition-all duration-300 relative overflow-hidden group',
        href && `cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${hoverBorderStyles[theme]}`,
        className
      )}
    >
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-zinc-800/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:scale-110 transition-transform duration-500" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105',
                iconThemeStyles[theme]
              )}
            >
              {icon}
            </div>
          )}
          {href && (
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-slate-900 dark:group-hover:text-zinc-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          )}
        </div>
      </div>

      <div className="relative mt-4 text-3xl sm:text-4xl font-bold tabular-nums text-slate-900 dark:text-zinc-100 tracking-tight">
        {value}
      </div>

      {progressPercent !== undefined && (
        <div className="relative mt-4 w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progressThemeStyles[theme])}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}

      {subtitle && (
        <div className="relative mt-3 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          {subtitle}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
