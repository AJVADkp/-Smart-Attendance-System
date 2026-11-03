'use client';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'sm:max-w-md md:max-w-lg',
  className,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const drawerNode = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 pointer-events-none flex justify-end sm:items-stretch items-end">
        <div
          className={cn(
            'pointer-events-auto w-full bg-white dark:bg-zinc-900 flex flex-col shadow-edis-lg border-[#FED7AA] dark:border-zinc-800 transition-colors',
            // Mobile: Bottom sheet
            'max-h-[85vh] rounded-t-[20px] border-t',
            // Desktop: Side panel (right-anchored)
            'sm:max-h-full sm:h-full sm:rounded-none sm:border-l',
            width,
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#FED7AA]/60 dark:border-zinc-800 bg-[#FFF7ED]/50 dark:bg-zinc-800/40 flex items-start justify-between gap-3 shrink-0">
            <div>
              <div className="text-base font-semibold text-[#1F2937] dark:text-zinc-100 tracking-tight">
                {title}
              </div>
              {subtitle && (
                <p className="text-xs text-[#6B7280] dark:text-zinc-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] dark:text-zinc-400 hover:text-[#EA580C] dark:hover:text-orange-400 hover:bg-[#FED7AA]/40 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-5 py-3.5 border-t border-[#FED7AA]/60 dark:border-zinc-800 bg-[#FFF7ED]/50 dark:bg-zinc-800/40 shrink-0 flex items-center justify-end gap-2.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerNode, document.body);
}
