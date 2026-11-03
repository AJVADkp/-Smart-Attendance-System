-- ============================================================
-- Smart Attendance System — Supabase PostgreSQL Schema
-- Database Initialization & Row Level Security (RLS) Policies
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Class Settings
CREATE TABLE IF NOT EXISTS public.class_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL DEFAULT 'Computer Science - Section A',
    roster_limit INT NOT NULL DEFAULT 65,
    default_buffer_min INT NOT NULL DEFAULT 2,
    worst_case_absence_pct NUMERIC NOT NULL DEFAULT 95,
    secs_per_absent_check NUMERIC NOT NULL DEFAULT 5.14,
    secs_per_present_reply NUMERIC NOT NULL DEFAULT 1.0,
    review_deadline_time TEXT NOT NULL DEFAULT '00:00',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Students Roster
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reg_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    bluetooth_address TEXT NOT NULL UNIQUE,
    phone_type TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Weekly Timetable
CREATE TABLE IF NOT EXISTS public.weekly_timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekday INT NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1: Mon, 7: Sun
    period_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher_name TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    windows INT NOT NULL DEFAULT 2,
    buffer_min INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Period Runs (Daily Executions)
CREATE TABLE IF NOT EXISTS public.period_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    timetable_entry_id UUID REFERENCES public.weekly_timetable(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    windows INT NOT NULL DEFAULT 2,
    buffer_min INT NOT NULL DEFAULT 2,
    roster_size INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'finished', 'cancelled', 'did_not_run')),
    locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Scanning Windows
CREATE TABLE IF NOT EXISTS public.windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_run_id UUID NOT NULL REFERENCES public.period_runs(id) ON DELETE CASCADE,
    number INT NOT NULL,
    scheduled_start TIMESTAMPTZ,
    hard_stop TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'did_not_run' CHECK (status IN ('completed', 'partial', 'did_not_run')),
    reason TEXT
);

-- 6. Raw Hardware Detections (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS public.detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id UUID NOT NULL REFERENCES public.windows(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    check_number INT NOT NULL DEFAULT 1,
    present BOOLEAN NOT NULL,
    response_ms INT NOT NULL DEFAULT 0,
    phone_name TEXT,
    raw_json TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Window Results
CREATE TABLE IF NOT EXISTS public.window_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id UUID NOT NULL REFERENCES public.windows(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL,
    checks_used INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_window_student UNIQUE (window_id, student_id)
);

-- 8. Final Attendance Results
CREATE TABLE IF NOT EXISTS public.attendance_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_run_id UUID NOT NULL REFERENCES public.period_runs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    windows_ran INT NOT NULL DEFAULT 0,
    windows_present INT NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT 'grey' CHECK (color IN ('green', 'yellow', 'orange', 'red', 'grey')),
    admin_override BOOLEAN NOT NULL DEFAULT false,
    final_status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (final_status IN ('present', 'under_review', 'absent', 'not_recorded')),
    reviewed BOOLEAN NOT NULL DEFAULT false,
    locked BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_period_student UNIQUE (period_run_id, student_id)
);

-- 9. Student Problem Reports
CREATE TABLE IF NOT EXISTS public.problem_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    period_run_id UUID NOT NULL REFERENCES public.period_runs(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    resolved_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 10. Administrative Audit Trail
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor TEXT NOT NULL DEFAULT 'admin',
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE public.class_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.window_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated Admin Access Policy
-- Grant full read/write access to authenticated users (admin portal)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'class_settings', 'students', 'weekly_timetable', 
        'period_runs', 'windows', 'detections', 
        'window_results', 'attendance_results', 
        'problem_reports', 'audit_log'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Admin Full Access" ON public.%I;
            CREATE POLICY "Admin Full Access" ON public.%I
                FOR ALL
                TO authenticated
                USING (true)
                WITH CHECK (true);
        ', t, t);
    END LOOP;
END $$;

-- Service Role Policy (For automated server actions and lookup endpoints)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'class_settings', 'students', 'weekly_timetable', 
        'period_runs', 'windows', 'detections', 
        'window_results', 'attendance_results', 
        'problem_reports', 'audit_log'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Service Role Access" ON public.%I;
            CREATE POLICY "Service Role Access" ON public.%I
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true);
        ', t, t);
    END LOOP;
END $$;

-- Seed Initial Class Settings Row
INSERT INTO public.class_settings (class_name, roster_limit, default_buffer_min, worst_case_absence_pct, secs_per_absent_check, secs_per_present_reply)
SELECT 'Computer Science - Section A', 65, 2, 95, 5.14, 1.0
WHERE NOT EXISTS (SELECT 1 FROM public.class_settings);
