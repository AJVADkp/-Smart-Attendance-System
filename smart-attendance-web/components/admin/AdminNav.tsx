'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WelcomeGuideModal } from '@/components/ui/WelcomeGuideModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Menu,
  X,
  Bluetooth,
  LayoutDashboard,
  Users,
  Clock,
  Radio,
  CalendarDays,
  FileQuestion,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAttendanceSession } from '@/contexts/AttendanceSessionContext';

interface NavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: any;
    exact?: boolean;
    badge?: number;
  }[];
}

export function AdminNav({
  adminEmail,
  openReportsCount = 0,
}: {
  adminEmail: string;
  openReportsCount?: number;
}) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [liveClock, setLiveClock] = useState<string>('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setLiveClock(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Live Operations',
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: '/admin/run', label: 'Live Scanner', icon: Radio },
      ],
    },
    {
      label: 'Classroom & Records',
      items: [
        { href: '/admin/students', label: 'Student Directory', icon: Users },
        { href: '/admin/timetable', label: 'Weekly Timetable', icon: Clock },
        { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
      ],
    },
    {
      label: 'Management',
      items: [
        {
          href: '/admin/reports',
          label: 'Problem Reports',
          icon: FileQuestion,
          badge: openReportsCount,
        },
        { href: '/admin/audit', label: 'Audit Trail', icon: ShieldCheck },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const allItems = navGroups.flatMap((g) => g.items);
  const currentItem = allItems.find((item) => isActive(item.href, item.exact));
  const currentTitle = currentItem ? currentItem.label : 'Admin Console';
  const CurrentIcon = currentItem?.icon;

  // Sanitize display email
  const displayEmail = adminEmail || 'admin@school.edu';

  const { status: sessionStatus, connected, activePeriod, connect } = useAttendanceSession();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 transition-colors">
      {/* 1. Brand Logo Header */}
      <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
        <Link href="/admin" prefetch={true} className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 shrink-0">
            <Image
              src="/logo.png"
              alt="Smart Attendance Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base text-slate-900 dark:text-zinc-100 tracking-tight leading-none group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              Smart Attendance
            </div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-1 truncate">
              Classroom Console
            </div>
          </div>
        </Link>
        {mobileDrawerOpen && (
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Grouped Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6" aria-label="Sidebar Navigation">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                const isScanning = item.href === '/admin/run' && sessionStatus === 'running';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                      active
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                          active ? 'text-white' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isScanning && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                      )}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[11px] font-bold rounded-full',
                            active
                              ? 'bg-white text-orange-600'
                              : 'bg-orange-100 text-orange-700'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. Hardware Node Status & User Profile Box */}
      <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 space-y-3 pb-8 lg:pb-14">
        {/* Hardware Card */}
        <div className="p-3 bg-white dark:bg-zinc-800/90 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  sessionStatus === 'running'
                    ? 'bg-emerald-500 animate-pulse'
                    : connected
                    ? 'bg-emerald-500'
                    : 'bg-slate-300 dark:bg-zinc-600'
                )}
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                {sessionStatus === 'running'
                  ? 'Scanning'
                  : connected
                  ? 'ESP32 Online'
                  : 'ESP32 Offline'}
              </span>
            </div>
            {sessionStatus === 'running' ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full uppercase shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                Live
              </span>
            ) : connected ? (
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-700/60 px-2 py-0.5 rounded-full shrink-0">
                USB CDC
              </span>
            ) : (
              <button
                type="button"
                onClick={connect}
                className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 bg-orange-50 dark:bg-orange-950/60 px-2.5 py-1 rounded-lg border border-orange-200/80 dark:border-orange-800/80 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors cursor-pointer shrink-0"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
              Instructor Console
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-mono">
              {displayEmail}
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
              title="Sign out of console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 xl:w-72 border-r border-slate-200/90 dark:border-zinc-800 z-40 bg-white dark:bg-zinc-900">
        {sidebarContent}
      </aside>

      {/* Top Application Bar (Across Desktop & Mobile) */}
      <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 lg:pl-64 xl:pl-72">
        <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
          {/* Left: Mobile Toggle & Desktop Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Branding (< 1024px) */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="relative w-8 h-8 shrink-0">
                <Image
                  src="/logo.png"
                  alt="Smart Attendance Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain drop-shadow-sm"
                  priority
                />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                {currentTitle}
              </span>
            </div>

            {/* Desktop Page Title (>= 1024px) */}
            <div className="hidden lg:flex items-center gap-2.5">
              {CurrentIcon && (
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-2xs shrink-0">
                  <CurrentIcon className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="font-bold text-lg text-slate-900 dark:text-zinc-100 tracking-tight">
                {currentTitle}
              </span>
            </div>
          </div>

          {/* Right: Theme Toggle, Live Digital Clock & Action Guide */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle size="sm" />

            {liveClock && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-100 text-xs font-mono font-semibold shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Clock className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                <span>{liveClock} IST</span>
              </div>
            )}

            <WelcomeGuideModal triggerClassName="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700" />
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-zinc-900 shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-zinc-800">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
