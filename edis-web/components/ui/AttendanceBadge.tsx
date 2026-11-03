import { cn } from '@/lib/utils';
import type { AttendanceColor } from '@/lib/constants';

const COLOR_STYLES: Record<AttendanceColor, { bg: string; text: string; border: string; label: string; icon: string }> = {
  green:  { bg: 'bg-green-50 dark:bg-emerald-950/40',   text: 'text-green-700 dark:text-emerald-300',  border: 'border-green-200 dark:border-emerald-800/60',  label: 'Present', icon: '✓' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/40',  text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800/60', label: 'Warning', icon: '!' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-[#C2410C] dark:text-orange-300',  border: 'border-orange-300 dark:border-orange-800/60', label: 'At Risk', icon: '⚠' },
  red:    { bg: 'bg-red-50 dark:bg-rose-950/40',     text: 'text-red-700 dark:text-rose-300',    border: 'border-red-200 dark:border-rose-800/60',    label: 'Absent',  icon: '✗' },
  grey:   { bg: 'bg-gray-50 dark:bg-zinc-800',    text: 'text-gray-500 dark:text-zinc-400',   border: 'border-gray-200 dark:border-zinc-700',   label: 'Pending', icon: '–' },
};

interface AttendanceBadgeProps {
  color: AttendanceColor;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export function AttendanceBadge({ color, label, size = 'md', className, showIcon = true }: AttendanceBadgeProps) {
  const s = COLOR_STYLES[color];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium border',
        s.bg, s.text, s.border,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs',
        className
      )}
      aria-label={label ?? s.label}
    >
      {showIcon && <span aria-hidden>{s.icon}</span>}
      {label ?? s.label}
    </span>
  );
}

/** Full attendance cell for the day table */
export function AttendanceCell({ color, label, className }: { color: AttendanceColor; label?: string; className?: string }) {
  const s = COLOR_STYLES[color];
  return (
    <div
      className={cn('w-full h-full flex items-center justify-center min-h-[40px] rounded font-medium text-xs border', s.bg, s.text, s.border, className)}
      role="cell"
      aria-label={label ?? s.label}
    >
      <span aria-hidden className="mr-0.5">{s.icon}</span>
      <span>{label ?? s.label}</span>
    </div>
  );
}
