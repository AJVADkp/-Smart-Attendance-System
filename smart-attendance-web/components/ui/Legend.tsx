import { cn } from '@/lib/utils';
import { StatusPill } from './StatusPill';

export interface LegendProps {
  isAdmin?: boolean;
  className?: string;
}

export function Legend({ isAdmin = true, className }: LegendProps) {
  return (
    <div
      className={cn(
        'p-3.5 bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 shadow-card flex flex-wrap items-center gap-3 text-xs transition-colors',
        className
      )}
    >
      <span className="font-semibold text-[#1F2937] dark:text-zinc-100 uppercase tracking-wider text-[11px]">
        Legend:
      </span>
      <StatusPill color="green" label="Present" size="sm" />
      {isAdmin && (
        <>
          <StatusPill color="yellow" label="Warning (!)" size="sm" />
          <StatusPill color="orange" label="Warning (!!)" size="sm" />
        </>
      )}
      {!isAdmin && (
        <StatusPill color="green" label="Present (under review)" size="sm" />
      )}
      <StatusPill color="red" label="Absent" size="sm" />
      <StatusPill color="grey" label="Pending / Cancelled" size="sm" />
    </div>
  );
}
