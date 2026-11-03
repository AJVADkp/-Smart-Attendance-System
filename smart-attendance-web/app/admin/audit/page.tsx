import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuditLogClient } from './AuditLogClient';

export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: logs, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(300);

  return <AuditLogClient logs={logs ?? []} />;
}
