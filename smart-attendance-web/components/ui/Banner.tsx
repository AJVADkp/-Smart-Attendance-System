import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface BannerProps {
  children: React.ReactNode;
  variant?: 'orange' | 'error' | 'success';
  title?: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Banner({
  children,
  variant = 'orange',
  title,
  icon,
  onDismiss,
  className,
}: BannerProps) {
  const configs = {
    orange: {
      bg: 'bg-orange-50/80 dark:bg-orange-950/40',
      border: 'border-orange-200/90 dark:border-orange-800/60',
      text: 'text-orange-900 dark:text-orange-200',
      titleText: 'text-orange-950 dark:text-orange-100 font-semibold',
      iconDefault: <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50/80 dark:bg-rose-950/40',
      border: 'border-rose-200/90 dark:border-rose-800/60',
      text: 'text-rose-900 dark:text-rose-200',
      titleText: 'text-rose-950 dark:text-rose-100 font-semibold',
      iconDefault: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
      border: 'border-emerald-200/90 dark:border-emerald-800/60',
      text: 'text-emerald-900 dark:text-emerald-200',
      titleText: 'text-emerald-950 dark:text-emerald-100 font-semibold',
      iconDefault: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    },
  };

  const cfg = configs[variant];

  return (
    <div
      className={cn(
        'p-4 rounded-xl border flex items-start gap-3.5 text-xs sm:text-sm shadow-2xs',
        cfg.bg,
        cfg.border,
        cfg.text,
        className
      )}
      role="alert"
    >
      <div className="mt-0.5 shrink-0">{icon ?? cfg.iconDefault}</div>
      <div className="flex-1 min-w-0">
        {title && (
          <div className={cn('font-semibold mb-0.5 tracking-tight', cfg.titleText)}>
            {title}
          </div>
        )}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
