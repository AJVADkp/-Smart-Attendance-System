import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StudentsClient } from './StudentsClient';

export default async function StudentsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/admin/login');
  const supabase = await createClient();

  const [studentsRes, settingsRes] = await Promise.all([
    supabase.from('students').select('*').order('reg_no_normalized'),
    supabase.from('class_settings').select('roster_limit').single(),
  ]);

  return (
    <StudentsClient
      students={studentsRes.data ?? []}
      rosterLimit={settingsRes.data?.roster_limit ?? 65}
    />
  );
}
