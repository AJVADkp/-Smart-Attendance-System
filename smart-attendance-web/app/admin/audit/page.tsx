import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuditLogClient } from './AuditLogClient';

export default async function AuditLogPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/admin/login');
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(300);

  return <AuditLogClient logs={logs ?? []} />;
}
