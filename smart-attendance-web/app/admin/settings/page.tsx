import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from './SettingsForm';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const [settingsRes, timetableRes] = await Promise.all([
    supabase.from('class_settings').select('*').single(),
    supabase.from('weekly_timetable').select('id, name, subject, start_time, end_time, windows, buffer_min'),
  ]);

  return (
    <div className="max-w-[760px] mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Classroom parameters, timing physics constants, and daily review rules"
      />
      <SettingsForm
        settings={settingsRes.data}
        timetableEntries={timetableRes.data ?? []}
        currentUserEmail={user.email ?? 'admin@school.edu'}
      />
    </div>
  );
}
