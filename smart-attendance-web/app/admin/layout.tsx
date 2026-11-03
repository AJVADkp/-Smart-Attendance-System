import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { AttendanceSessionProvider } from '@/contexts/AttendanceSessionContext';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Query open problem reports count for badge
  let openReportsCount = 0;
  if (user) {
    const { count } = await supabase
      .from('problem_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    openReportsCount = count ?? 0;
  }

  return (
    <AttendanceSessionProvider>
      {!user ? (
        children
      ) : (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col selection:bg-orange-100 dark:selection:bg-orange-950/60 text-slate-900 dark:text-zinc-100 transition-colors duration-200">
          <AdminNav
            adminEmail={user.email ?? ''}
            openReportsCount={openReportsCount}
          />
          <div className="lg:pl-64 xl:pl-72 flex-1 flex flex-col">
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </div>
      )}
    </AttendanceSessionProvider>
  );
}
