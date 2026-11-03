'use client';

// ============================================================
// contexts/AttendanceSessionContext.tsx
// Persistent background attendance runner across all admin pages.
// Runs scheduled Bluetooth scans without interrupting on page navigation.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealSerialAdapter } from '@/lib/serial/realAdapter';
import { MockSerialAdapter, createDefaultMock } from '@/lib/serial/mockAdapter';
import { planWindows, shouldRunExtraRound } from '@/lib/windowEngine';
import { calculateWorstCaseWindowDuration } from '@/lib/planner';
import { calcAttendanceColor } from '@/lib/colors';
import {
  MIN_CHECKS_PER_WINDOW,
  MAX_CHECKS_PER_WINDOW,
  HARD_STOP_GAP_SECS,
} from '@/lib/constants';
import { formatTime12IST, findActiveOrUpcomingPeriod } from '@/lib/utils';
import { autoResolveEndedDayReviews } from '@/lib/autoResolveUnderReview';
import type { SerialAdapter } from '@/lib/serial/types';

export interface Student {
  id: string;
  name: string;
  bluetooth_address: string;
  reg_no: string;
  phone_type?: string;
}

export interface PeriodRun {
  id: string;
  name: string;
  subject: string;
  start_at: string;
  end_at: string;
  windows: number;
  buffer_min: number;
  status?: string;
  saved_settings?: any;
}

export type RunStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'running'
  | 'paused'
  | 'finished'
  | 'connection_lost'
  | 'error';

export interface PhoneStatus {
  student: Student;
  present: boolean | null;
  checksUsed: number;
  notChecked: boolean;
}

export interface CheckEvent {
  id: string;
  time: string;
  studentName: string;
  regNo: string;
  present: boolean;
  round: number;
}

export interface WindowResult {
  windowNum: number;
  present: number;
  absent: number;
  notChecked: number;
}

interface AttendanceSessionContextValue {
  status: RunStatus;
  statusMsg: string;
  connected: boolean;
  activePeriod: PeriodRun | null;
  allPeriods: PeriodRun[];
  students: Student[];
  currentWindow: number;
  currentRound: number;
  totalWindows: number;
  phoneStatuses: PhoneStatus[];
  checkEvents: CheckEvent[];
  windowResults: WindowResult[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startRun: (immediate?: boolean) => Promise<void>;
  setActivePeriod: (period: PeriodRun) => void;
}

const AttendanceSessionContext = createContext<AttendanceSessionContextValue | null>(null);

const IS_MOCK = process.env.NEXT_PUBLIC_SERIAL_ADAPTER === 'mock';

export function AttendanceSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [connected, setConnected] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodRun | null>(null);
  const [allPeriods, setAllPeriods] = useState<PeriodRun[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentWindow, setCurrentWindow] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalWindows, setTotalWindows] = useState(2);
  const [phoneStatuses, setPhoneStatuses] = useState<PhoneStatus[]>([]);
  const [checkEvents, setCheckEvents] = useState<CheckEvent[]>([]);
  const [windowResults, setWindowResults] = useState<WindowResult[]>([]);

  const adapterRef = useRef<SerialAdapter | null>(null);
  const runningRef = useRef(false);
  const consecutiveHeartbeatFails = useRef(0);
  const wakeLockRef = useRef<any>(null);
  const supabase = createClient();

  // Screen WakeLock helper
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        const wl = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = wl;
      }
    } catch {}
  }

  // 1. Initial Data Fetch: Load active period & active students
  const refreshSessionData = useCallback(async () => {
    try {
      const now = new Date();
      const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

      const [studentsRes, runsRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, name, reg_no, bluetooth_address, phone_type')
          .eq('active', true)
          .order('reg_no_normalized'),
        supabase
          .from('period_runs')
          .select('*')
          .eq('date', todayISO)
          .order('start_at'),
      ]);

      const stuList: Student[] = studentsRes.data ?? [];
      setStudents(stuList);

      const runList: PeriodRun[] = runsRes.data ?? [];
      setAllPeriods(runList);

      // Find current active period (in session right now) or next upcoming period today
      const selected = findActiveOrUpcomingPeriod(runList, new Date());

      if (selected) {
        setActivePeriod(selected);
        setTotalWindows(selected.windows || 2);
      }

      setPhoneStatuses(
        stuList.map((s) => ({
          student: s,
          present: null,
          checksUsed: 0,
          notChecked: true,
        }))
      );
    } catch (err) {
      console.warn('Session data fetch error:', err);
    }
  }, []);

  useEffect(() => {
    refreshSessionData();
  }, [refreshSessionData]);

  // 2. Hardware Connect Handler
  const connect = useCallback(async () => {
    if (adapterRef.current && connected) return;

    setStatus('connecting');
    setStatusMsg('Opening Web Serial port…');

    try {
      const adapter: SerialAdapter = IS_MOCK
        ? createDefaultMock()
        : new RealSerialAdapter();

      await adapter.connect();
      adapterRef.current = adapter;

      setStatusMsg('Verifying ESP32 communication (PING)…');
      const alive = await adapter.ping();

      if (!alive && !IS_MOCK) {
        const msg = 'No PONG reply from ESP32. Please re-seat USB cable.';
        setStatusMsg(msg);
        setStatus('error');
        throw new Error(msg);
      }

      setConnected(true);
      consecutiveHeartbeatFails.current = 0;
      setStatus('connected');
      setStatusMsg(IS_MOCK ? 'Mock adapter ready.' : 'ESP32 connected at 115200 baud.');
      await requestWakeLock();
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message ?? 'Failed to connect serial port.');
      throw err;
    }
  }, [connected]);

  // 3. Hardware Disconnect Handler
  const disconnect = useCallback(async () => {
    runningRef.current = false;
    try {
      await adapterRef.current?.disconnect();
    } catch {}
    adapterRef.current = null;
    setConnected(false);
    setStatus('idle');
    setStatusMsg('Hardware disconnected.');
    try {
      await wakeLockRef.current?.release();
    } catch {}
  }, []);

  // 4. Automated Run Session
  const startRun = useCallback(async (immediate: boolean = false) => {
    if (!adapterRef.current || !activePeriod || runningRef.current) return;

    runningRef.current = true;
    setStatus('running');
    setStatusMsg(`Auto-Pilot: Scanning ${activePeriod.name} (${activePeriod.subject})…`);

    // Fetch freshest active students roster from database at period start
    const { data: initialRoster } = await supabase
      .from('students')
      .select('id, name, reg_no, bluetooth_address, phone_type')
      .eq('active', true)
      .order('reg_no_normalized');

    const activeRoster: Student[] =
      initialRoster && initialRoster.length > 0 ? initialRoster : students;
    setStudents(activeRoster);

    const settings = activePeriod.saved_settings;
    const secsPerAbsent = settings?.secs_per_absent_check ?? 5.14;
    const hardStopGapSecs = HARD_STOP_GAP_SECS;
    const worstCase = calculateWorstCaseWindowDuration(activeRoster.length, secsPerAbsent);

    const windows = planWindows({
      periodStart: new Date(activePeriod.start_at),
      periodEnd: new Date(activePeriod.end_at),
      bufferMin: activePeriod.buffer_min,
      numWindows: activePeriod.windows || 2,
      hardStopGapSecs,
      rosterSize: activeRoster.length,
      secsPerAbsent,
    });

    // Mark period run 'running' in Supabase
    await supabase
      .from('period_runs')
      .update({ status: 'running' })
      .eq('id', activePeriod.id);

    const studentStatuses: Map<string, PhoneStatus> = new Map(
      activeRoster.map((s) => [s.id, { student: s, present: null, checksUsed: 0, notChecked: true }])
    );

    const periodResults: Map<string, { presentCount: number; ranCount: number }> = new Map(
      activeRoster.map((s) => [s.id, { presentCount: 0, ranCount: 0 }])
    );

    const windowBreakdowns: WindowResult[] = [];

    for (let wIdx = 0; wIdx < windows.length; wIdx++) {
      if (!runningRef.current) break;
      const w = windows[wIdx];

      // Wait until this window's scheduled start time (unless forced immediate)
      const scheduledMs = w.scheduledStart.getTime();
      if (!immediate && Date.now() < scheduledMs) {
        while (Date.now() < scheduledMs && runningRef.current) {
          const diffSecs = Math.max(0, Math.round((scheduledMs - Date.now()) / 1000));
          const mins = Math.floor(diffSecs / 60);
          const secs = diffSecs % 60;
          const timeRemainingStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

          setStatusMsg(
            wIdx === 0
              ? `Period starting. Standing by for Window 1 at ${formatTime12IST(
                  w.scheduledStart
                )} (${timeRemainingStr}).`
              : `Window ${wIdx} complete. Standing by for Window ${w.windowNumber} (Final Scan) at ${formatTime12IST(
                  w.scheduledStart
                )} (in ${timeRemainingStr}). Window timing dynamically adjusted for ${studentStatuses.size} students (worst-case ${worstCase.formatted}).`
          );

          const waitStep = Math.min(1000, scheduledMs - Date.now());
          await new Promise((r) => setTimeout(r, waitStep));
        }
      }

      if (!runningRef.current) break;

      // Dynamic mid-period student sync:
      // If a student was enrolled mid-period, query Supabase and register them before this window starts
      const { data: liveRosterRes } = await supabase
        .from('students')
        .select('id, name, reg_no, bluetooth_address, phone_type')
        .eq('active', true)
        .order('reg_no_normalized');

      const liveRoster: Student[] =
        liveRosterRes && liveRosterRes.length > 0 ? liveRosterRes : activeRoster;
      setStudents(liveRoster);

      // Register any newly enrolled students in status maps
      liveRoster.forEach((s) => {
        if (!studentStatuses.has(s.id)) {
          studentStatuses.set(s.id, {
            student: s,
            present: null,
            checksUsed: 0,
            notChecked: true,
          });
        }
        if (!periodResults.has(s.id)) {
          // Mid-period enrollee: ranCount starts at 0 (missed previous windows in this period)
          periodResults.set(s.id, { presentCount: 0, ranCount: 0 });
        }
      });

      setCurrentWindow(w.windowNumber);

      // Create window entry in Supabase
      const { data: winRow } = await supabase
        .from('windows')
        .insert({
          period_run_id: activePeriod.id,
          window_num: w.windowNumber,
          start_at: new Date().toISOString(),
          status: 'running',
        })
        .select('id')
        .single();

      // Reset student status for this window across ALL registered students
      liveRoster.forEach((s) => {
        studentStatuses.set(s.id, { student: s, present: null, checksUsed: 0, notChecked: true });
      });
      setPhoneStatuses(Array.from(studentStatuses.values()));

      let round = 1;
      const windowDeadline = w.hardStop.getTime();

      while (round <= MAX_CHECKS_PER_WINDOW && runningRef.current) {
        setCurrentRound(round);
        const unconfirmed = Array.from(studentStatuses.values()).filter(
          (ps) => ps.present !== true && ps.checksUsed < round
        );

        if (unconfirmed.length === 0) break;

        for (const ps of unconfirmed) {
          if (!runningRef.current) break;
          // Round 1 always scans; subsequent rounds obey deadline
          if (round > 1 && w.hardStop.getTime() > Date.now() && Date.now() >= windowDeadline) break;

          try {
            const res = await adapterRef.current.check(ps.student.bluetooth_address);
            ps.checksUsed += 1;
            ps.notChecked = false;

            if (res.present) {
              ps.present = true;
            } else if (round >= MIN_CHECKS_PER_WINDOW) {
              ps.present = false;
            }

            studentStatuses.set(ps.student.id, { ...ps });
            setPhoneStatuses(Array.from(studentStatuses.values()));

            // Add real-time event log
            const evt: CheckEvent = {
              id: `${ps.student.id}-${w.windowNumber}-${round}-${Date.now()}`,
              time: formatTime12IST(new Date()),
              studentName: ps.student.name,
              regNo: ps.student.reg_no,
              present: res.present,
              round,
            };
            setCheckEvents((prev) => [evt, ...prev.slice(0, 19)]);

            // Record raw detection in Supabase
            if (winRow) {
              await supabase.from('detections').insert({
                period_run_id: activePeriod.id,
                student_id: ps.student.id,
                window_num: w.windowNumber,
                detected: res.present,
                detected_at: new Date().toISOString(),
                response_ms: res.responseMs,
                tries: res.tries,
              });
            }
          } catch {}
        }

        // Check if extra round fits in time
        const unconfirmedRemaining = Array.from(studentStatuses.values()).filter(
          (ps) => ps.present !== true
        ).length;
        const timeLeftMs = Math.max(0, windowDeadline - Date.now());

        const canExtra = shouldRunExtraRound(
          unconfirmedRemaining,
          round,
          timeLeftMs,
          secsPerAbsent
        );

        if (!canExtra) break;
        round += 1;
      }

      // Finalize window statistics
      let wPresent = 0;
      let wAbsent = 0;
      let wUnchecked = 0;

      studentStatuses.forEach((ps, sId) => {
        const stats = periodResults.get(sId)!;
        stats.ranCount += 1;
        if (ps.present === true) {
          wPresent += 1;
          stats.presentCount += 1;
        } else if (ps.present === false) {
          wAbsent += 1;
        } else {
          wUnchecked += 1;
        }
      });

      windowBreakdowns.push({
        windowNum: w.windowNumber,
        present: wPresent,
        absent: wAbsent,
        notChecked: wUnchecked,
      });
      setWindowResults([...windowBreakdowns]);

      if (winRow) {
        await supabase
          .from('windows')
          .update({
            end_at: new Date().toISOString(),
            status: wUnchecked > 0 ? 'partial' : 'finished',
          })
          .eq('id', winRow.id);
      }
    }

    // Write final attendance_results to Supabase
    for (const [sId, stats] of periodResults.entries()) {
      const color = calcAttendanceColor({
        windowsRan: stats.ranCount,
        windowsPresent: stats.presentCount,
      });
      const finalStatus =
        color === 'grey'
          ? 'not_recorded'
          : color === 'red'
          ? 'absent'
          : 'present';

      await supabase.from('attendance_results').upsert(
        {
          period_run_id: activePeriod.id,
          student_id: sId,
          windows_ran: stats.ranCount,
          windows_present: stats.presentCount,
          color,
          final_status: finalStatus,
          reviewed: false,
          locked: false,
        },
        { onConflict: 'period_run_id,student_id' }
      );
    }

    // Mark period run finished
    await supabase
      .from('period_runs')
      .update({ status: 'finished' })
      .eq('id', activePeriod.id);

    // Auto-resolve any yellow/orange records for completed sessions to Present
    await autoResolveEndedDayReviews(supabase);

    runningRef.current = false;
    setStatus('finished');
    setStatusMsg(`Session complete for ${activePeriod.name}. Records saved to database.`);

    // Automatically transition to the next period on today's timetable
    const now = new Date();
    const updatedAll = allPeriods.map((p) =>
      p.id === activePeriod.id ? { ...p, status: 'finished' } : p
    );
    setAllPeriods(updatedAll);

    const next = findActiveOrUpcomingPeriod(updatedAll, now);
    setTimeout(() => {
      if (next) {
        setActivePeriod(next);
        setStatus('connected');
        setStatusMsg(
          `Completed ${activePeriod.name}. Standing by for ${next.name} (${next.subject}) at ${formatTime12IST(
            next.start_at
          )}.`
        );
      } else {
        setStatus('connected');
        setStatusMsg('All scheduled classroom periods for today have concluded.');
      }
    }, 2500);
  }, [activePeriod, students, allPeriods]);

  // 5. Auto-pilot: Automatically launch scan when ESP32 connected if class is currently in session
  useEffect(() => {
    if (
      connected &&
      status === 'connected' &&
      activePeriod &&
      activePeriod.status !== 'finished' &&
      !runningRef.current &&
      students.length > 0
    ) {
      const now = Date.now();
      const pStart = new Date(activePeriod.start_at).getTime();
      const pEnd = new Date(activePeriod.end_at).getTime();
      const isPeriodLive = now >= pStart && now <= pEnd;

      if (!isPeriodLive) {
        console.log(
          `[Auto-Attendance] ESP32 connected, but ${activePeriod.name} is scheduled for ${activePeriod.start_at}. Waiting for period window.`
        );
        return;
      }

      const timer = setTimeout(() => {
        if (!runningRef.current) {
          startRun();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [connected, status, activePeriod, students, startRun]);

  // 5b. Continuous Schedule Runner: Checks every 5 seconds for live period transitions
  useEffect(() => {
    if (!connected || runningRef.current || students.length === 0) return;

    const interval = setInterval(() => {
      if (runningRef.current) return;

      const now = new Date();
      const currentOrUpcoming = findActiveOrUpcomingPeriod(allPeriods, now);

      if (currentOrUpcoming) {
        if (!activePeriod || activePeriod.id !== currentOrUpcoming.id) {
          setActivePeriod(currentOrUpcoming);
        }

        const pStart = new Date(currentOrUpcoming.start_at).getTime();
        const pEnd = new Date(currentOrUpcoming.end_at).getTime();
        const nowMs = now.getTime();

        // If period is in session right now and not finished, trigger automated scan
        if (
          nowMs >= pStart &&
          nowMs <= pEnd &&
          currentOrUpcoming.status !== 'finished' &&
          currentOrUpcoming.status !== 'cancelled'
        ) {
          console.log(
            `[Auto-Pilot] Period ${currentOrUpcoming.name} is LIVE NOW (${formatTime12IST(
              currentOrUpcoming.start_at
            )} - ${formatTime12IST(currentOrUpcoming.end_at)}). Triggering automated scan.`
          );
          startRun();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connected, allPeriods, activePeriod, students, startRun]);

  // 6. Auto-reconnect if port previously granted by browser
  useEffect(() => {
    async function tryAutoConnect() {
      if (typeof window !== 'undefined' && 'serial' in navigator && !connected && status === 'idle') {
        try {
          const ports = await (navigator as any).serial.getPorts();
          if (ports && ports.length > 0) {
            await connect().catch((e) => {
              console.warn('Auto-reconnect silent notice:', e?.message || e);
            });
          }
        } catch {}
      }
    }
    tryAutoConnect();
  }, [connected, status, connect]);

  // 7. Background Heartbeat Monitor
  useEffect(() => {
    if (!connected || status === 'running') return;

    const interval = setInterval(async () => {
      if (runningRef.current || !adapterRef.current) return;
      try {
        const alive = await adapterRef.current.ping();
        if (alive) {
          consecutiveHeartbeatFails.current = 0;
        } else {
          consecutiveHeartbeatFails.current += 1;
        }
      } catch {
        consecutiveHeartbeatFails.current += 1;
      }

      if (consecutiveHeartbeatFails.current >= 2) {
        setConnected(false);
        setStatus('connection_lost');
        setStatusMsg('ESP32 serial connection lost. Please reconnect hardware.');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [connected, status]);

  // 8. Lifecycle Cleanup on window close
  useEffect(() => {
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      adapterRef.current?.disconnect().catch(() => {});
    };
  }, []);

  return (
    <AttendanceSessionContext.Provider
      value={{
        status,
        statusMsg,
        connected,
        activePeriod,
        allPeriods,
        students,
        currentWindow,
        currentRound,
        totalWindows,
        phoneStatuses,
        checkEvents,
        windowResults,
        connect,
        disconnect,
        startRun,
        setActivePeriod,
      }}
    >
      {children}
    </AttendanceSessionContext.Provider>
  );
}

export function useAttendanceSession() {
  const ctx = useContext(AttendanceSessionContext);
  if (!ctx) {
    return {
      status: 'idle',
      statusMsg: '',
      connected: false,
      activePeriod: null,
      allPeriods: [],
      students: [],
      currentWindow: 0,
      currentRound: 1,
      totalWindows: 2,
      phoneStatuses: [],
      checkEvents: [],
      windowResults: [],
      connect: async () => {},
      disconnect: async () => {},
      startRun: async () => {},
      setActivePeriod: () => {},
    } as AttendanceSessionContextValue;
  }
  return ctx;
}
