import { cn } from '@/lib/utils';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function Card({ children, className, title, description, action }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
        className
      )}
    >
      {(title || description || action) && (
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/40',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-6 py-3.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-800/40 text-xs text-slate-500 dark:text-zinc-400',
        className
      )}
    >
      {children}
    </div>
  );
}
