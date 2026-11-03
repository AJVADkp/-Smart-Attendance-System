export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-zinc-800">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-zinc-800/60 rounded" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-9 w-24 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800" />
            </div>
            <div className="h-8 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Body Skeleton */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800/80"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
