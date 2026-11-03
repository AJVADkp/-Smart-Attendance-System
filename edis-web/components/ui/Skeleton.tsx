import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[10px] bg-[#FED7AA]/30 dark:bg-zinc-800', className)}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-2.5 w-36" />
    </div>
  );
}
