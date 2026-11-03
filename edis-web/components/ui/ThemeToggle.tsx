'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ThemeToggle({
  className,
  showLabel = false,
  size = 'md',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === 'dark' : false;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer select-none',
        'border border-slate-200/90 dark:border-zinc-700/80',
        'bg-white/90 dark:bg-zinc-800/90 hover:bg-slate-100 dark:hover:bg-zinc-700',
        'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white',
        'shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
        size === 'sm' ? 'w-8 h-8' : 'w-9 h-9',
        showLabel && 'w-auto px-3 gap-2',
        className
      )}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          className={cn(
            'w-4 h-4 text-amber-500 transition-all duration-300 absolute',
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
        />
        <Moon
          className={cn(
            'w-4 h-4 text-sky-400 transition-all duration-300 absolute',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          )}
        />
      </div>

      {showLabel && (
        <span className="text-xs font-semibold">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
}
