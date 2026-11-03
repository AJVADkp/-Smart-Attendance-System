import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const STYLES: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  info:    { bg: 'bg-[#FFF7ED] dark:bg-orange-950/40', border: 'border-[#FED7AA] dark:border-orange-800/60', text: 'text-[#EA580C] dark:text-orange-300',  icon: Info },
  success: { bg: 'bg-green-50 dark:bg-emerald-950/40',  border: 'border-green-200 dark:border-emerald-800/60', text: 'text-green-800 dark:text-emerald-200',  icon: CheckCircle2 },
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-200 dark:border-yellow-800/60',text: 'text-yellow-800 dark:text-yellow-200', icon: AlertCircle },
  error:   { bg: 'bg-red-50 dark:bg-rose-950/40',    border: 'border-red-200 dark:border-rose-800/60',   text: 'text-red-800 dark:text-rose-200',    icon: XCircle },
};

export function Alert({ variant = 'info', title, children, className }: {
  variant?: AlertVariant; title?: string; children: React.ReactNode; className?: string;
}) {
  const s = STYLES[variant];
  const Icon = s.icon;
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', s.bg, s.border, s.text, className)} role="alert">
      <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
      <div>
        {title && <p className="font-semibold text-sm">{title}</p>}
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}
