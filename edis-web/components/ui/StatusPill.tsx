import { cn } from '@/lib/utils';
import { Check, AlertTriangle, AlertCircle, X, Clock } from 'lucide-react';

export type AttendanceColorType = 'green' | 'yellow' | 'orange' | 'red' | 'grey';

export interface StatusPillProps {
  color: AttendanceColorType;
  label?: React.ReactNode;
  icon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function StatusPill({
  color,
  label,
  icon = true,
  size = 'md',
  className,
  onClick,
}: StatusPillProps) {
  const configs: Record<
    AttendanceColorType,
    { bg: string; text: string; border: string; defaultLabel: string; Icon: any }
  > = {
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/60',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200/90 dark:border-emerald-800/60',
      defaultLabel: 'Present',
      Icon: Check,
    },
    yellow: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/60',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200/90 dark:border-amber-800/60',
      defaultLabel: 'Review (!)',
      Icon: AlertTriangle,
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200/90 dark:border-orange-800/60',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-200/90 dark:border-orange-800/60',
      defaultLabel: 'Review (!!)',
      Icon: AlertCircle,
    },
    red: {
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/90 dark:border-rose-800/60',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200/90 dark:border-rose-800/60',
      defaultLabel: 'Absent',
      Icon: X,
    },
    grey: {
      bg: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
      text: 'text-slate-600 dark:text-zinc-400',
      border: 'border-slate-200 dark:border-zinc-700',
      defaultLabel: 'Pending',
      Icon: Clock,
    },
  };

  const cfg = configs[color] || configs.grey;
  const IconComponent = cfg.Icon;

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[11px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  };

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center font-semibold rounded-full border shadow-2xs transition-all duration-150 select-none whitespace-nowrap',
        cfg.bg,
        cfg.border,
        sizeClasses[size],
        onClick && 'hover:brightness-95 hover:shadow-xs cursor-pointer active:scale-95',
        className
      )}
    >
      {icon && <IconComponent className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
      <span>{label ?? cfg.defaultLabel}</span>
    </Component>
  );
}
