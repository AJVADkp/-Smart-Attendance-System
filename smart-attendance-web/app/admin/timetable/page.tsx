import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TimetableClient } from './TimetableClient';

export default async function TimetablePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const [ttRes, settingsRes, studentsRes] = await Promise.all([
    supabase
      .from('weekly_timetable')
      .select('*')
      .eq('active', true)
      .order('weekday')
      .order('start_time'),
    supabase.from('class_settings').select('*').single(),
    supabase.from('students').select('id', { count: 'exact' }).eq('active', true),
  ]);

  return (
    <TimetableClient
      entries={ttRes.data ?? []}
      settings={settingsRes.data}
      activeStudentCount={studentsRes.count ?? 0}
    />
  );
}
