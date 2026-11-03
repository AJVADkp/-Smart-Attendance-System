'use client';
import { useState, useEffect } from 'react';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RunEngine } from './RunEngine';
import {
  Monitor,
  Play,
  RefreshCw,
  Clock,
  ArrowRight,
  Cpu,
  Bluetooth,
  CheckCircle2,
} from 'lucide-react';
import { createTodayPeriodRuns } from './actions';
import {
  formatTimeRange12,
  formatTime12IST,
  cn,
  findActiveOrUpcomingPeriod,
  getPeriodTemporalState,
} from '@/lib/utils';
import { useAttendanceSession, type PeriodRun } from '@/contexts/AttendanceSessionContext';
import { Radio } from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  bluetooth_address: string;
  reg_no: string;
  phone_type?: string;
}

export function RunPageClient({
  todayDateStr,
  periodRuns,
  students,
  settings,
}: {
  todayDateStr: string;
  periodRuns: PeriodRun[];
  students: Student[];
  settings: any;
}) {
  const [webSerialSupported, setWebSerialSupported] = useState<boolean | null>(null);
  const [selectedRun, setSelectedRun] = useState<PeriodRun | null>(null);
  const [manuallyCleared, setManuallyCleared] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isMock = process.env.NEXT_PUBLIC_SERIAL_ADAPTER === 'mock';

  useEffect(() => {
    // Web Serial check
    const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
    setWebSerialSupported(hasSerial || isMock);
  }, [isMock]);

  const session = useAttendanceSession();
  const { connected, activePeriod } = session;

  // Auto-select active or upcoming scheduled period for zero-click launch
  useEffect(() => {
    if (!manuallyCleared && !selectedRun && periodRuns.length > 0) {
      if (activePeriod) {
        setSelectedRun(activePeriod);
      } else {
        const target = findActiveOrUpcomingPeriod(periodRuns, new Date());
        if (target) setSelectedRun(target);
      }
    }
  }, [periodRuns, selectedRun, manuallyCleared, activePeriod]);

  async function handleSyncSchedule() {
    setGenerating(true);
    try {
      await createTodayPeriodRuns();
      window.location.reload();
    } finally {
      setGenerating(false);
    }
  }

  // Notice for unsupported browsers (Phones, Tablets, Firefox, Safari)
  if (webSerialSupported === false) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto shadow-sm my-8 transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
          <Monitor className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2 tracking-tight">
          Desktop Chrome or Edge Required
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          The classroom attendance node communicates with the ESP32 using the{' '}
          <strong>Web Serial API</strong>. Please open this page in Google Chrome or Microsoft
          Edge on a laptop or desktop computer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mock mode banner */}
      {isMock && (
        <Banner variant="orange" title="Mock Hardware Simulation Active">
          The attendance engine is operating with a simulated ESP32 node. To connect to physical hardware over USB, set{' '}
          <code className="font-mono font-bold bg-orange-100 px-1.5 py-0.5 rounded text-orange-800">
            NEXT_PUBLIC_SERIAL_ADAPTER=real
          </code>
          .
        </Banner>
      )}

      {students.length === 0 && (
        <Banner variant="error" title="No Students Enrolled">
          Your class roster currently has 0 active students. Please enroll students in the Student Directory before launching a probe run.
        </Banner>
      )}

      {periodRuns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Clock className="w-6 h-6" />}
            title="No Attendance Sessions for Today"
            description="Your weekly timetable schedule has no periods configured for today's weekday, or today's runs have not been synced."
            actionLabel="Sync Today's Timetable"
            onAction={handleSyncSchedule}
          />
        </Card>
      ) : (
        <>
          {!selectedRun && (
            <div className="space-y-4">
              {/* Autopilot Status Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-orange-50/80 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 border border-orange-200/90 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-colors">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-glow-orange">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>Timetable Scheduled Autopilot</span>
                      <Badge variant="orange">Zero Manual Clicks</Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Once connected, scanning starts and progresses automatically based on each period&apos;s bell schedule. Concluded periods are skipped automatically.
                    </p>
                  </div>
                </div>
                {connected && (
                  <Badge variant="success">ESP32 Hardware Connected</Badge>
                )}
              </div>

              <Card
                title="Today's Classroom Sessions"
                description="Chronological schedule of periods. Autopilot runs each session automatically during class time."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncSchedule}
                    loading={generating}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Schedule</span>
                  </Button>
                }
              >
                <div className="space-y-3">
                  {periodRuns.map((run) => {
                    const timeRange = formatTimeRange12(run.start_at, run.end_at);
                    const temporal = getPeriodTemporalState(run.start_at, run.end_at, run.status, new Date());
                    const isFinished = run.status === 'finished';
                    const isCancelled = run.status === 'cancelled';
                    const isRunning = run.status === 'running' || temporal.isCurrent;

                    return (
                      <div
                        key={run.id}
                        className={cn(
                          'flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl border transition-all gap-4',
                          temporal.isCurrent
                            ? 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700/60 shadow-sm'
                            : isFinished || isCancelled || temporal.isPast
                            ? 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-200/70 dark:border-zinc-800 opacity-75'
                            : 'bg-white dark:bg-zinc-800/90 border-slate-200/90 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-xs'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-base text-slate-900 dark:text-zinc-100">
                              {run.subject || run.name}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md">
                              {run.name}
                            </span>
                            <Badge variant={temporal.displayStatus.variant}>
                              {temporal.displayStatus.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-medium flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            <span className={cn(temporal.isCurrent && 'text-slate-900 dark:text-zinc-100 font-semibold')}>
                              {timeRange}
                            </span>
                            <span>•</span>
                            <span>
                              {run.windows} checking windows ({run.buffer_min}m buffer)
                            </span>
                            {temporal.isCurrent && (
                              <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                                Live Session
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                          <Button
                            onClick={() => {
                              setManuallyCleared(false);
                              setSelectedRun(run);
                            }}
                            size="sm"
                            variant={temporal.isCurrent ? 'primary' : 'secondary'}
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>
                              {temporal.isCurrent
                                ? 'Open Live Scanner'
                                : isFinished
                                ? 'View Breakdown'
                                : temporal.isPast
                                ? 'Manual Re-run'
                                : 'Manual Launch'}
                            </span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {selectedRun && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 px-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs transition-colors">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setManuallyCleared(true);
                    setSelectedRun(null);
                  }}
                >
                  ← Back to Period Selection
                </Button>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                  <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200/80 dark:border-orange-800/60">
                    {selectedRun.name}
                  </span>
                  <span>{selectedRun.subject}</span>
                </div>
              </div>

              <RunEngine periodRun={selectedRun} students={students} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
