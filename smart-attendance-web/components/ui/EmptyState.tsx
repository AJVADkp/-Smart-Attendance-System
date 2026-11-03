import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  actionNode?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  actionNode,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white dark:bg-zinc-900 rounded-[14px] border border-dashed border-[#FED7AA] dark:border-zinc-800',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#FFF7ED] dark:bg-zinc-800 border border-[#FED7AA] dark:border-zinc-700 flex items-center justify-center text-[#EA580C] dark:text-orange-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#1F2937] dark:text-zinc-100 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#6B7280] dark:text-zinc-400 max-w-sm mt-1 leading-normal">
        {description}
      </p>

      {(actionNode || actionLabel) && (
        <div className="mt-5">
          {actionNode ? (
            actionNode
          ) : actionHref ? (
            <a href={actionHref}>
              <Button size="sm">{actionLabel}</Button>
            </a>
          ) : (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
