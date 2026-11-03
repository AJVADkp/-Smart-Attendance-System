'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import {
  Bluetooth,
  Play,
  Cpu,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { formatTimeRange12, cn } from '@/lib/utils';
import { useAttendanceSession } from '@/contexts/AttendanceSessionContext';

interface AutoPeriod {
  id: string;
  name: string;
  subject: string;
  start_at: string;
  end_at: string;
  status: string;
  windows: number;
  buffer_min: number;
}

interface AutoStudent {
  id: string;
  name: string;
  regNo: string;
}

export function AutoAttendanceModal({
  defaultOpen = true,
  triggerClassName,
  hideTrigger = false,
}: {
  defaultOpen?: boolean;
  triggerClassName?: string;
  hideTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [stepStatus, setStepStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [activePeriod, setActivePeriod] = useState<AutoPeriod | null>(null);
  const [allPeriods, setAllPeriods] = useState<AutoPeriod[]>([]);
  const [students, setStudents] = useState<AutoStudent[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [serialSupported, setSerialSupported] = useState<boolean>(false);

  const router = useRouter();
  const supabase = createClient();
  const session = useAttendanceSession();

  // Load session info & check auth on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Check serial support
      const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
      if (mounted) setSerialSupported(hasSerial);

      // 2. Check if user already dismissed for this tab session
      const dismissed = sessionStorage.getItem('auto_attendance_modal_dismissed');
      if (!dismissed && defaultOpen && hasSerial) {
        if (mounted) setOpen(true);
      }

      // 3. Check admin auth state
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted) setIsAdmin(!!user);
      } catch {
        if (mounted) setIsAdmin(false);
      }

      // 4. Fetch today's session info from /api/auto-session
      try {
        const res = await fetch('/api/auto-session');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setActivePeriod(data.activePeriod);
            setAllPeriods(data.periodRuns || []);
            setStudents(data.students || []);
          }
        }
      } catch {}

      if (mounted) setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [defaultOpen]);

  function handleDismiss() {
    sessionStorage.setItem('auto_attendance_modal_dismissed', 'true');
    setOpen(false);
  }

  // 1-Click Launch: Connects Web Serial in user gesture and starts background automated attendance runner
  async function handleLaunchAutomated() {
    setErrorMsg('');
    setConnecting(true);

    try {
      // Step A: Request USB port and establish connection in user gesture
      setStepStatus('Opening Web Serial… Select your ESP32 in the browser prompt');
      await session.connect();

      // Step B: Start background automated attendance scanning loop
      setStepStatus('ESP32 Verified! Starting automated attendance scanning…');
      sessionStorage.setItem('auto_attendance_modal_dismissed', 'true');

      // Start the persistent background run
      await session.startRun();

      // Step C: Smoothly close modal, leaving admin on current page with live scanning in top nav
      setTimeout(() => {
        setConnecting(false);
        setStepStatus('');
        setOpen(false);
      }, 600);
    } catch (err: any) {
      setConnecting(false);
      setStepStatus('');
      const msg = String(err?.message || '');
      if (
        msg.includes('No port selected') ||
        msg.includes('user cancelled') ||
        msg.includes('No USB port selected')
      ) {
        setErrorMsg('Port selection cancelled. Please click the button again and select your ESP32 device.');
      } else if (msg.includes('busy') || msg.includes('Failed to open') || msg.includes('in use')) {
        setErrorMsg('COM port is busy. If the Arduino IDE Serial Monitor or another tab is open, please close it and try again.');
      } else {
        setErrorMsg(err.message || 'Could not initialize serial connection.');
      }
    }
  }

  // Format today's active period time range
  const timeRange = activePeriod
    ? formatTimeRange12(activePeriod.start_at, activePeriod.end_at)
    : '';

  return (
    <>
      {/* Reusable Header Launcher Button */}
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white hover:from-[#EA580C] hover:to-[#C2410C] transition-all cursor-pointer shadow-card shrink-0',
            triggerClassName
          )}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">Start Auto-Attendance</span>
          <span className="sm:hidden">Auto-Scan</span>
        </button>
      )}

      {/* Centered Modal */}
      {open && (
        <Modal
          open={true}
          onClose={handleDismiss}
          size="md"
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-gradient-to-b from-[#F97316] to-[#EA580C] text-white flex items-center justify-center shadow-card shrink-0">
                <Bluetooth className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-[#1F2937] dark:text-zinc-100">Automated Classroom Attendance</div>
                <div className="text-[11px] text-[#6B7280] dark:text-zinc-400 font-normal">
                  ESP32 Bluetooth Node • Automated Timetable Scanning
                </div>
              </div>
            </div>
          }
          footer={
            <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>

              <Button
                onClick={handleLaunchAutomated}
                loading={connecting}
                size="md"
                className="w-full sm:w-auto shadow-card order-1 sm:order-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Connect ESP32 & Start Automatic Attendance</span>
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-[#FEF2F2] dark:bg-rose-950/40 border border-[#FCA5A5] dark:border-rose-800/60 rounded-[10px] text-xs text-[#991B1B] dark:text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Connecting Spinner / Progress */}
            {connecting && (
              <div className="p-4 bg-[#FFF7ED] dark:bg-zinc-900 border border-[#FED7AA] dark:border-zinc-800 rounded-[12px] text-center space-y-2">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#EA580C] text-white shadow-card animate-bounce">
                  <Bluetooth className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-[#1F2937] dark:text-zinc-100">Connecting to Attendance Node…</div>
                <p className="text-xs text-[#EA580C] dark:text-orange-400 font-medium">{stepStatus}</p>
              </div>
            )}

            {/* Session Summary Card */}
            {!connecting && (
              <>
                <div className="p-4 rounded-[12px] bg-gradient-to-b from-[#FFF7ED] to-white dark:from-zinc-900 dark:to-zinc-950 border border-[#FED7AA] dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#EA580C] dark:text-orange-400 uppercase tracking-wider">
                      Current Classroom Session
                    </span>
                    <Badge variant="orange">Automated Ready</Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#1F2937] dark:text-zinc-100">
                      {activePeriod ? activePeriod.subject : 'Classroom Attendance Session'}
                    </h3>
                    <p className="text-xs text-[#6B7280] dark:text-zinc-400 mt-0.5 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#EA580C] dark:text-orange-400" />
                      <span>{activePeriod ? `${activePeriod.name} • ${timeRange}` : "Today's Schedule"}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#FED7AA]/60 dark:border-zinc-800 flex items-center justify-between text-xs text-[#6B7280] dark:text-zinc-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-[#EA580C] dark:text-orange-400" />
                      <span>{students.length} Enrolled Student Devices</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Zero Manual Clicks Required</span>
                    </span>
                  </div>
                </div>

                {/* Plain instructions */}
                <div className="p-3.5 bg-[#EFF6FF] dark:bg-zinc-850 dark:bg-zinc-800/70 border border-[#BFDBFE] dark:border-zinc-700 rounded-[10px] text-xs text-[#1E40AF] dark:text-zinc-200 flex items-start gap-2.5">
                  <Cpu className="w-4 h-4 text-[#2563EB] dark:text-orange-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Zero-Configuration Workflow:</strong> Just plug in the ESP32 node via USB and click the button below. The system automatically connects, performs hardware verification in the background, and runs scheduled attendance scanning for the class.
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
