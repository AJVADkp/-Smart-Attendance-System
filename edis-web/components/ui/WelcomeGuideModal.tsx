'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Bluetooth,
  Smartphone,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Clock,
  ArrowRight,
  Radio,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function WelcomeGuideModal({
  defaultOpen = false,
  triggerClassName,
}: {
  defaultOpen?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (defaultOpen) {
        setOpen(true);
      }
    }
  }, [defaultOpen]);

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('attendance_guide_seen', 'true');
    }
    setOpen(false);
  }

  return (
    <>
      {/* Reusable Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FFF7ED] dark:bg-zinc-800 text-[#EA580C] dark:text-orange-400 border border-[#FED7AA] dark:border-zinc-700 hover:bg-[#FFEDD5] dark:hover:bg-zinc-700 hover:border-[#F97316] transition-colors cursor-pointer shadow-2xs shrink-0',
          triggerClassName
        )}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">How it works</span>
        <span className="sm:hidden">Guide</span>
      </button>

      {/* Guide Pop-up Modal */}
      {open && (
        <Modal
          open={true}
          onClose={handleDismiss}
          title={
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 shrink-0">
                <Image
                  src="/logo.png"
                  alt="Smart Attendance Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-zinc-100">How It Works</div>
                <div className="text-[10px] sm:text-[11px] text-[#6B7280] dark:text-zinc-400 font-normal">
                  Automated Classroom Attendance System — Quick Guide
                </div>
              </div>
            </div>
          }
          size="lg"
          footer={
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[11px] text-[#6B7280] dark:text-zinc-400 text-center sm:text-left">
                Tip: Reopen anytime via the <strong>How it works</strong> button in the top bar.
              </span>
              <Button onClick={handleDismiss} size="sm" className="w-full sm:w-auto">
                <span>Got it, Let's Explore!</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Persona Switcher Tabs */}
            <div className="flex rounded-[10px] bg-[#FFF7ED] dark:bg-zinc-800 p-1 border border-[#FED7AA]/60 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                className={cn(
                  'flex-1 py-1.5 px-2 sm:px-3 rounded-[8px] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center',
                  activeTab === 'student'
                    ? 'bg-white dark:bg-zinc-900 text-[#EA580C] dark:text-orange-400 shadow-2xs'
                    : 'text-[#6B7280] dark:text-zinc-400 hover:text-[#1F2937] dark:hover:text-zinc-200'
                )}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>Students</span>
                <span className="hidden sm:inline text-[#6B7280] dark:text-zinc-400 font-normal text-[11px]">
                  (Lookup)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teacher')}
                className={cn(
                  'flex-1 py-1.5 px-2 sm:px-3 rounded-[8px] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center',
                  activeTab === 'teacher'
                    ? 'bg-white dark:bg-zinc-900 text-[#EA580C] dark:text-orange-400 shadow-2xs'
                    : 'text-[#6B7280] dark:text-zinc-400 hover:text-[#1F2937] dark:hover:text-zinc-200'
                )}
              >
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span>Teachers</span>
                <span className="hidden sm:inline text-[#6B7280] dark:text-zinc-400 font-normal text-[11px]">
                  (Auto-Pilot)
                </span>
              </button>
            </div>

            {/* Student View Flow */}
            {activeTab === 'student' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white dark:bg-zinc-800/90 rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#EA580C] dark:text-orange-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#FFF7ED] dark:bg-zinc-900 flex items-center justify-center text-[11px]">1</span>
                      <span>Bluetooth ON</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                      Just leave standard Bluetooth turned ON in phone settings. No app download or device pairing needed.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-800/90 rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#EA580C] dark:text-orange-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#FFF7ED] dark:bg-zinc-900 flex items-center justify-center text-[11px]">2</span>
                      <span>Enter Reg No</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                      Type your college Registration Number on the homepage to open your personal monthly attendance calendar.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-800/90 rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#EA580C] dark:text-orange-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#FFF7ED] dark:bg-zinc-900 flex items-center justify-center text-[11px]">3</span>
                      <span>100% Private</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                      Your phone's hardware Bluetooth address is strictly encrypted and never visible in the student portal.
                    </p>
                  </div>
                </div>

                {/* Status Badges Explanation */}
                <div className="p-3.5 rounded-[10px] bg-[#FFF7ED]/70 dark:bg-zinc-800/50 border border-[#FED7AA] dark:border-zinc-700 space-y-2">
                  <div className="text-xs font-semibold text-[#1F2937] dark:text-zinc-100">Attendance Status & Indicators:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 bg-[#DCFCE7]/70 dark:bg-emerald-950/40 rounded-[8px] border border-[#86EFAC] dark:border-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Present</div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Confirmed present in classroom</div>
                      </div>
                    </div>

                    <div className="p-2 bg-[#FEF9C3]/80 dark:bg-amber-950/40 rounded-[8px] border border-[#FDE047] dark:border-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300">Under Review</div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-400">Warning &bull; Click to report issue</div>
                      </div>
                    </div>

                    <div className="p-2 bg-[#FEE2E2]/70 dark:bg-rose-950/40 rounded-[8px] border border-[#FCA5A5] dark:border-rose-800 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-rose-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-red-800 dark:text-rose-300">Absent</div>
                        <div className="text-[10px] text-red-700 dark:text-rose-400">Phone not detected</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teacher / Auto-Pilot Flow */}
            {activeTab === 'teacher' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white dark:bg-zinc-800/90 rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#EA580C] dark:text-orange-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#FFF7ED] dark:bg-zinc-900 flex items-center justify-center text-[11px]">1</span>
                      <span>Plug In ESP32 Node</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                      Connect the ESP32 hardware via USB (115200 baud). The Web Serial API detects it automatically.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-800/90 rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#EA580C] dark:text-orange-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#FFF7ED] dark:bg-zinc-900 flex items-center justify-center text-[11px]">2</span>
                      <span>Auto-Pilot Probing</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                      Zero manual clicks. The node automatically scans student phones during scheduled timetable period windows.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-800/90 rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#EA580C] dark:text-orange-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#FFF7ED] dark:bg-zinc-900 flex items-center justify-center text-[11px]">3</span>
                      <span>Instant Cloud Sync</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                      Detections, window tallies, and student attendance colors are saved directly to Supabase cloud in real time.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-[10px] bg-[#FFF7ED] dark:bg-zinc-800 border border-[#FED7AA] dark:border-zinc-700 flex items-start gap-2.5 text-xs text-[#854D0E] dark:text-zinc-300">
                  <Radio className="w-4 h-4 text-[#EA580C] dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#1F2937] dark:text-zinc-100">True Automated Operation: </span>
                    <span>
                      Once students and timetable periods are configured, teachers simply keep the ESP32 connected. Scanning and records happen in the background without any manual button clicking!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
