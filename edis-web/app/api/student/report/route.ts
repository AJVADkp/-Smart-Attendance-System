import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeRegNo } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const { studentId, regNo, periodRunId, message } = await req.json().catch(() => ({}));

  if ((!studentId && !regNo) || !periodRunId || !message?.trim()) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  let targetStudentId = studentId;
  if (!targetStudentId && regNo) {
    const normalized = normalizeRegNo(regNo);
    const { data: st } = await supabase
      .from('students')
      .select('id')
      .eq('reg_no_normalized', normalized)
      .maybeSingle();
    targetStudentId = st?.id;
  }

  if (!targetStudentId) {
    return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
  }

  await supabase.from('problem_reports').insert({
    student_id: targetStudentId,
    period_run_id: periodRunId,
    message: message.trim(),
    status: 'open',
  });

  return NextResponse.json({ success: true });
}
