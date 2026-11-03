'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Bluetooth, ShieldCheck, ArrowRight, Sparkles, Smartphone, Zap, CheckCircle2 } from 'lucide-react';
import { StudentCalendar } from '@/components/student/StudentCalendar';
import { WelcomeGuideModal } from '@/components/ui/WelcomeGuideModal';
import Link from 'next/link';

interface AttendanceResult {
  periodRunId: string;
  date: string;
  periodName: string;
  subject: string;
  startAt: string;
  endAt: string;
  periodStatus: string;
  color: string;
  label: string;
  locked: boolean;
}

interface StudentData {
  student: { name: string; regNo: string; className?: string };
  results: AttendanceResult[];
}

export default function StudentHomePage() {
  const [regNo, setRegNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<StudentData | null>(null);

  const showDemoHints = process.env.NEXT_PUBLIC_DEMO_HINTS === 'true';

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const cleanReg = regNo.trim();
    if (!cleanReg) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch('/api/student/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNo: cleanReg }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many tries, please wait a minute.');
        } else {
          setError('Registration number not found.');
        }
      } else {
        setData(json);
      }
    } catch {
      setError('Registration number not found.');
    } finally {
      setLoading(false);
    }
  }

  if (data) {
    return <StudentCalendar data={data} onBack={() => setData(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col selection:bg-orange-100 dark:selection:bg-orange-950/60 relative overflow-hidden transition-colors duration-200">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-200/40 dark:bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Student Header */}
      <header className="border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-2xs sticky top-0 z-20 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0 group">
              <Image
                src="/logo.png"
                alt="Smart Attendance Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                priority
              />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-zinc-100 tracking-tight">
                Smart Attendance
              </span>
              <span className="hidden sm:inline-block text-[11px] text-orange-600 dark:text-orange-400 font-semibold ml-2 uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200/60 dark:border-orange-800/60">
                Student Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <ThemeToggle size="sm" />
            <WelcomeGuideModal triggerClassName="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700" />
            <Link
              href="/admin"
              className="text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors whitespace-nowrap pl-1 flex items-center gap-1"
            >
              <span>Faculty Portal</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-12 w-full relative z-10">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Hero Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-400 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Smart Attendance Portal</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
              Check Your Attendance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Enter your college registration number to view your real-time verified classroom records.
            </p>
          </div>

          {/* Interactive Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-md p-6 sm:p-8 space-y-6 transition-colors">
            {error && (
              <div
                className="text-xs font-semibold text-rose-700 dark:text-rose-300 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLookup} className="space-y-4">
              <Input
                label="Student Registration Number"
                value={regNo}
                onChange={(e) => {
                  setRegNo(e.target.value);
                  if (error) setError('');
                }}
                required
                autoFocus
                autoComplete="off"
                placeholder="e.g. CCE25CS031"
                hint="Case-insensitive. Letters and numbers only."
              />

              {/* Demo hints shown ONLY if NEXT_PUBLIC_DEMO_HINTS=true */}
              {showDemoHints && (
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <span className="font-medium">Quick sample:</span>
                  <button
                    type="button"
                    onClick={() => setRegNo('CCE25CS031')}
                    className="text-orange-600 hover:underline font-semibold cursor-pointer"
                  >
                    CCE25CS031
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setRegNo('CCE25CS042')}
                    className="text-orange-600 hover:underline font-semibold cursor-pointer"
                  >
                    CCE25CS042
                  </button>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                size="md"
                className="w-full mt-2 text-sm font-semibold py-3 shadow-glow-orange"
              >
                <span>View Attendance Record</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </form>

            {/* Privacy Guarantee */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Hardware-verified: Bluetooth MAC addresses remain confidential</span>
            </div>

            {/* 3 Value Propositions */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
              <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-zinc-800/60">
                <div className="font-bold text-slate-900 dark:text-zinc-100 text-xs">Zero App</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  No install needed
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-zinc-800/60">
                <div className="font-bold text-slate-900 dark:text-zinc-100 text-xs">No Pairing</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Standard Classic BT
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-zinc-800/60">
                <div className="font-bold text-slate-900 dark:text-zinc-100 text-xs">Fast Verification</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Replies in seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-zinc-500 border-t border-slate-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/80 backdrop-blur-xs relative z-10 transition-colors">
        Automated Classroom Attendance System
      </footer>
    </div>
  );
}
