'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { TZ } from '@/lib/utils';

interface Props {
  initialDateStr?: string;
  showBadge?: boolean;
}

export function LiveDashboardClock({ initialDateStr = '', showBadge = true }: Props) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(initialDateStr);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    function update() {
      const now = new Date();

      // Time: "10:08:45 AM"
      const t = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);

      // Date: "Wednesday, 28 Oct 2026"
      const d = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(now);

      setTimeStr(t);
      setDateStr(d);
    }

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 font-medium">
        <span>{initialDateStr}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="text-sm font-medium text-slate-600 dark:text-zinc-400">{dateStr}</span>
      <span className="text-slate-300 dark:text-zinc-600 hidden sm:inline">•</span>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-mono text-xs font-semibold shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Clock className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
        <span>{timeStr} IST</span>
      </div>
    </div>
  );
}
