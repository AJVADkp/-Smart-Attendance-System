import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  backLabel = 'Back',
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-2', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EA580C] hover:text-[#C2410C] transition-colors mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] leading-tight font-semibold text-[#1F2937] dark:text-zinc-100 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <div className="text-sm text-[#6B7280] dark:text-zinc-400 mt-1 leading-normal">
              {subtitle}
            </div>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
