'use client';
// ============================================================
// app/admin/run/RunEngine.tsx — Live Attendance Engine Cockpit
// ============================================================
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatTimeRange12, cn } from '@/lib/utils';
import { calculateWorstCaseWindowDuration } from '@/lib/planner';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  Play,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  Radio,
  Clock,
  Eye,
  Smartphone,
  Signal,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAttendanceSession, type PeriodRun, type PhoneStatus } from '@/contexts/AttendanceSessionContext';

interface Student {
  id: string;
  name: string;
  bluetooth_address: string;
  reg_no: string;
  phone_type?: string;
}

const IS_MOCK = process.env.NEXT_PUBLIC_SERIAL_ADAPTER === 'mock';

export function RunEngine({
  periodRun,
  students,
}: {
  periodRun: PeriodRun;
  students: Student[];
}) {
  const session = useAttendanceSession();
  const {
    status,
    statusMsg,
    connected,
    currentWindow,
    currentRound,
    totalWindows,
    phoneStatuses,
    windowResults,
    checkEvents,
    connect: handleConnect,
    disconnect: handleDisconnect,
    startRun,
    setActivePeriod,
  } = session;

  const [wakeLockActive, setWakeLockActive] = useState(false);

  useEffect(() => {
    if (periodRun && periodRun.id !== session.activePeriod?.id) {
      setActivePeriod(periodRun);
    }
  }, [periodRun, session.activePeriod?.id, setActivePeriod]);

  // Merge session's phoneStatuses with students list to ensure every student is visible in the grid
  const statusMap = new Map<string, PhoneStatus>();
  phoneStatuses.forEach((ps) => {
    statusMap.set(ps.student.id, ps);
  });

  const displayList = students.map((s) => {
    const existing = statusMap.get(s.id);
    if (existing) return existing;
    return {
      student: s,
      present: null,
      checksUsed: 0,
      notChecked: true,
    } as PhoneStatus;
  });

  const presentCount = displayList.filter((p) => p.present === true).length;
  const absentCount = displayList.filter((p) => p.present === false).length;
  const pendingCount = displayList.filter((p) => p.notChecked || p.present === null).length;
  const checkedCount = displayList.filter((p) => !p.notChecked).length;
  const progressPercent = students.length > 0 ? Math.round((checkedCount / students.length) * 100) : 0;

  const worstTiming = calculateWorstCaseWindowDuration(
    students.length,
    periodRun.saved_settings?.secs_per_absent_check ?? 5.14
  );

  return (
    <div className="space-y-6">
      {/* 1. ESP32 Hardware Status / Connect Card */}
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-slate-900 dark:text-zinc-100">
              {IS_MOCK
                ? 'Mock Adapter (Simulated Bluetooth Hardware)'
                : 'ESP32 Hardware Node'}
            </span>
          </div>
        }
        description="USB Serial link with classroom Bluetooth node via Web Serial API."
        action={
          connected ? (
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online (115200 baud)</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={status === 'running'}
              >
                Disconnect
              </Button>
            </div>
          ) : null
        }
      >
        {!connected ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-center shadow-glow-orange shrink-0">
                <Bluetooth className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100">Connect Node to Begin Scanning</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-xl">
                  Plug in the ESP32 node via USB and click below. Attendance scans automatically according to timetable schedule, or can be triggered manually anytime.
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              loading={status === 'connecting'}
              size="md"
              className="w-full sm:w-auto shadow-md shrink-0 py-2.5 px-5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Connect ESP32 Scanner</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <BluetoothConnected className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Classroom Node Active & Synchronized
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                  {statusMsg || 'ESP32 connected and ready for scanning windows.'}
                </p>
              </div>
            </div>

            {/* Manual Start Scan Now Button */}
            {status !== 'running' && (
              <Button
                size="md"
                className="shadow-glow-orange shrink-0 font-bold"
                onClick={() => startRun(true)}
                disabled={students.length === 0}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Scan Now</span>
              </Button>
            )}
          </div>
        )}

        {wakeLockActive && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Eye className="w-3.5 h-3.5 text-orange-500" />
            <span>Screen wake-lock active: display kept awake during window probes.</span>
          </div>
        )}
      </Card>

      {/* Hardware Error Banner */}
      {status === 'error' && (
        <Banner variant="error" title="ESP32 Communication Issue">
          {statusMsg || 'Could not communicate with the ESP32 node. Please check your USB connection.'}
          <div className="mt-2.5">
            <Button size="sm" onClick={handleConnect} className="shadow-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry ESP32 Connection</span>
            </Button>
          </div>
        </Banner>
      )}

      {/* Connection Lost Banner */}
      {status === 'connection_lost' && (
        <Banner variant="error" title="USB Disconnected">
          The ESP32 serial link dropped during session execution. Click below to reconnect.
          <div className="mt-2">
            <Button size="sm" onClick={handleConnect}>
              Reconnect Hardware
            </Button>
          </div>
        </Banner>
      )}

      {/* 2. Session Header & Window Status Cockpit */}
      <Card
        title={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-zinc-100">{periodRun.name} — {periodRun.subject}</span>
            <Badge variant="orange">
              Window {currentWindow} of {totalWindows}
            </Badge>
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            <span>Session: {formatTimeRange12(periodRun.start_at, periodRun.end_at)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
              <span>Worst-case scan:</span>
              <strong className="text-orange-600 dark:text-orange-400 font-mono font-bold">{worstTiming.formatted}</strong>
              <span>(calibrated for {students.length} students)</span>
            </span>
          </div>
        }
        action={
          status === 'running' ? (
            <Badge variant="orange" icon={<Radio className="w-3.5 h-3.5 animate-pulse text-orange-600" />}>
              Scanning Active: Window {currentWindow} (Round {currentRound})
            </Badge>
          ) : status === 'finished' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => startRun(true)}
              disabled={!connected || students.length === 0}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Attendance</span>
            </Button>
          ) : connected ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => startRun(true)}
                disabled={students.length === 0}
                className="shadow-sm font-semibold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Scan Now</span>
              </Button>
            </div>
          ) : (
            <Badge variant="neutral">Waiting for ESP32 Link</Badge>
          )
        }
      >
        {status === 'finished' && (
          <Banner variant="success" title="Session Complete">
            All {totalWindows} attendance windows completed successfully. Student detections have been recorded and synced to the database. Past & concluded records have been auto-marked Present.
          </Banner>
        )}

        {/* Live Running Progress Panel & Metrics */}
        <div className="space-y-6">
          {/* Real-time Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-700 dark:text-zinc-300">
                {status === 'running' ? `Window ${currentWindow} Probing Progress:` : 'Attendance Probing Status:'}
              </span>
              <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                {checkedCount} of {students.length} checked ({progressPercent}%)
                {status === 'running' && ` • Round ${currentRound} of 5`}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-zinc-700">
              <div
                className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/90 dark:border-emerald-800/60 shadow-2xs">
              <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {presentCount}
              </div>
              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Confirmed Present</span>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 rounded-2xl border border-rose-200/90 dark:border-rose-800/60 shadow-2xs">
              <div className="text-3xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
                {absentCount}
              </div>
              <div className="text-xs text-rose-800 dark:text-rose-300 font-semibold mt-1 flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>No Reply (Absent)</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-800/90 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-2xs">
              <div className="text-3xl font-extrabold text-slate-700 dark:text-zinc-200 tabular-nums">
                {pendingCount}
              </div>
              <div className="text-xs text-slate-600 dark:text-zinc-400 font-semibold mt-1 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span>Pending In Queue</span>
              </div>
            </div>

            <div className="p-4 bg-orange-50/70 dark:bg-orange-950/40 rounded-2xl border border-orange-200/90 dark:border-orange-800/60 shadow-2xs">
              <div className="text-3xl font-extrabold text-orange-700 dark:text-orange-400 tabular-nums">
                Round {currentRound}
              </div>
              <div className="text-xs text-orange-800 dark:text-orange-300 font-semibold mt-1 flex items-center justify-center gap-1">
                <Radio className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>Current Iteration</span>
              </div>
            </div>
          </div>

          {/* High-Tech Radar Visualizer (When scanning is active) */}
          {status === 'running' && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-white border border-zinc-800 shadow-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-400">
                      Active RF Radar Probing
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Window {currentWindow} Scanner Active
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Scanning active classroom Bluetooth devices via BLE advertisement probing packets.
                  </p>
                </div>

                {/* Animated Concentric Radar Dish */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping duration-1000" />
                  <div className="absolute w-28 h-28 rounded-full border border-orange-500/30" />
                  <div className="absolute w-20 h-20 rounded-full border border-orange-500/40" />
                  <div className="absolute w-12 h-12 rounded-full border border-orange-500/60" />
                  {/* Rotating beam line */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500/30 via-transparent to-transparent animate-spin duration-700" />
                  <div className="w-4 h-4 rounded-full bg-orange-500 shadow-glow-orange animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Live Streaming Probe Activity Stream */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2.5">
              <div className="flex items-center gap-2">
                <Signal className="w-4 h-4 text-orange-500" />
                <span>Recent Probe Activity Stream</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                {status === 'running' ? 'Live Telemetry' : 'Session History'}
              </span>
            </div>
            <div
              className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800 text-xs shadow-inner"
              aria-live="polite"
            >
              {checkEvents.length === 0 ? (
                <div className="p-4 text-center text-slate-400 dark:text-zinc-500 italic text-xs">
                  {status === 'running'
                    ? 'Initializing first probe round…'
                    : 'Click "Start Scan Now" above or wait for the scheduled bell time to begin probing.'}
                </div>
              ) : (
                checkEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {evt.present ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900 dark:text-zinc-100">
                        {evt.studentName}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                        {evt.regNo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <span className={evt.present ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-medium'}>
                        {evt.present ? 'Detected Present' : 'No response'}
                      </span>
                      <span className="text-slate-400 dark:text-zinc-500 font-mono">{evt.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Live Student Presence Grid */}
      <Card
        title={
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-slate-900 dark:text-zinc-100">Student Presence Grid</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                {students.length} Enrolled
              </span>
            </div>
          </div>
        }
        description="Real-time per-student detection telemetry, Bluetooth hardware address, and probe statuses."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((item) => {
            const isConfirmedPresent = item.present === true;
            const isAbsent = item.present === false;
            const isPending = item.notChecked || item.present === null;

            return (
              <div
                key={item.student.id}
                className={cn(
                  'p-4.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3',
                  isConfirmedPresent
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                    : isAbsent
                    ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 shadow-2xs'
                    : 'bg-white dark:bg-zinc-800/90 border-slate-200/90 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 shadow-2xs'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                      {item.student.name}
                    </h4>
                    <div className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                      {item.student.reg_no}
                    </div>
                  </div>

                  {/* Presence Status Badge */}
                  <div>
                    {isConfirmedPresent ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>Present</span>
                      </span>
                    ) : isAbsent ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                        <span>Absent</span>
                      </span>
                    ) : status === 'running' && !item.notChecked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse">
                        <Radio className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>Probing</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Device & Hardware Details */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                    <span>Bluetooth MAC:</span>
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200">
                      {item.student.bluetooth_address}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                      <span>Device:</span>
                    </span>
                    <span className="font-medium text-slate-700 dark:text-zinc-200 truncate max-w-[130px]">
                      {item.student.phone_type || 'Bluetooth Device'}
                    </span>
                  </div>
                  {item.checksUsed > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 pt-0.5">
                      <span>Probes used:</span>
                      <span className="font-mono font-semibold text-slate-600 dark:text-zinc-300">{item.checksUsed} tries</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 4. Completed Window Breakdown Summary */}
      {windowResults.length > 0 && (
        <Card
          title="Window Breakdown Summary"
          description="Detection telemetry per scanning window"
        >
          <div className="space-y-3">
            {windowResults.map((wr) => (
              <div
                key={wr.windowNum}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs font-medium gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                    Window {wr.windowNum}
                  </span>
                  <span className="text-slate-400 dark:text-zinc-500">•</span>
                  <span className="text-slate-600 dark:text-zinc-300">
                    {wr.present + wr.absent} students checked
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold">
                    ✓ {wr.present} Present
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold">
                    ✗ {wr.absent} Absent
                  </span>
                  {wr.notChecked > 0 ? (
                    <span className="text-slate-500 dark:text-zinc-400">— {wr.notChecked} Unchecked</span>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">100% Probed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
