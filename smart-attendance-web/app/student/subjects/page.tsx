'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudentSubjectView } from '@/components/student/StudentSubjectView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
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
  isReview?: boolean;
  locked: boolean;
}

interface StudentData {
  student: { name: string; regNo: string; className?: string };
  results: AttendanceResult[];
}

function SubjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const regNoParam = searchParams.get('regNo') || '';

  const [regNo, setRegNo] = useState(regNoParam);
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(Boolean(regNoParam));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regNoParam) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/student/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regNo: regNoParam.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Registration number not found.');
        }
        return res.json();
      })
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load subject attendance.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [regNoParam]);

  function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    const clean = regNo.trim();
    if (!clean) return;
    router.push(`/student/subjects?regNo=${encodeURIComponent(clean)}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <p className="text-xs text-slate-500 dark:text-zinc-400">Loading subject attendance...</p>
        </div>
      </div>
    );
  }

  if (data) {
    return (
      <StudentSubjectView
        data={data}
        onBack={() => {
          if (regNoParam) {
            router.push(`/?regNo=${encodeURIComponent(regNoParam)}`);
          } else {
            router.push('/');
          }
        }}
        isStandalone={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-zinc-100 font-bold">
          <BookOpen className="w-5 h-5 text-orange-600" />
          <h2>Subject-wise Attendance</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Enter your registration number to view your subject attendance breakdown.
        </p>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleManualLookup} className="space-y-3">
          <Input
            label="Registration Number"
            value={regNo}
            onChange={(e) => setRegNo(e.target.value.toUpperCase())}
            placeholder="e.g. CCE25CS000"
            required
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="w-full">
              View Subjects
            </Button>
            <Link href="/" className="shrink-0">
              <Button type="button" variant="outline">
                Back
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentSubjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      }
    >
      <SubjectContent />
    </Suspense>
  );
}
