'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { createStudent, updateStudent, deactivateStudent } from './actions';
import {
  UserPlus,
  Pencil,
  UserX,
  Search,
  Smartphone,
  Hash,
  Bluetooth,
  CheckCircle2,
  X,
  Users,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudentAttendanceDrawer } from '@/components/admin/StudentAttendanceDrawer';

interface Student {
  id: string;
  reg_no: string;
  reg_no_normalized: string;
  name: string;
  bluetooth_address: string;
  phone_type: string;
  active: boolean;
  created_at: string;
}

interface Props {
  students: Student[];
  rosterLimit: number;
}

function StudentForm({
  student,
  onClose,
}: {
  student?: Student;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [btVal, setBtVal] = useState(student?.bluetooth_address ?? '');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      if (student) {
        await updateStudent(student.id, fd);
      } else {
        await createStudent(fd);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Banner variant="error">{error}</Banner>}
      <Input
        label="Registration Number"
        name="reg_no"
        defaultValue={student?.reg_no ?? ''}
        required
        placeholder="e.g. CCE25CS031"
        hint="Unique student identifier (case-insensitive)"
        icon={<Hash className="w-4 h-4 text-[#EA580C]" />}
      />
      <Input
        label="Student Full Name"
        name="name"
        defaultValue={student?.name ?? ''}
        required
        placeholder="e.g. Arjun Kumar"
      />
      <div>
        <Input
          label="Bluetooth Address (Classic BT MAC)"
          name="bluetooth_address"
          value={btVal}
          onChange={(e) => setBtVal(e.target.value.toUpperCase())}
          required
          placeholder="AA:BB:CC:DD:EE:01"
          hint="6 hex pairs separated by colons (e.g. AA:BB:CC:DD:EE:01)"
          pattern="^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$"
          icon={<Bluetooth className="w-4 h-4 text-[#EA580C]" />}
        />
        {!student && (
          <div className="flex gap-1.5 mt-1.5">
            <span className="text-[11px] text-[#6B7280] dark:text-zinc-400">Demo sample:</span>
            <button
              type="button"
              onClick={() =>
                setBtVal('AA:BB:CC:DD:EE:0' + Math.floor(1 + Math.random() * 9))
              }
              className="text-[11px] text-[#EA580C] dark:text-orange-400 hover:underline cursor-pointer font-medium"
            >
              Fill Sample MAC
            </button>
          </div>
        )}
      </div>
      <Input
        label="Phone Model / Device"
        name="phone_type"
        defaultValue={student?.phone_type ?? ''}
        placeholder="e.g. Samsung Galaxy S23, OnePlus 11"
        hint="Optional note to help identify phone"
        icon={<Smartphone className="w-4 h-4 text-[#EA580C]" />}
      />
      <div className="flex gap-2.5 justify-end pt-3 border-t border-[#FED7AA] dark:border-zinc-800">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {student ? 'Save Changes' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
}

export function StudentsClient({ students, rosterLimit }: Props) {
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active'>('active');
  const [showAdd, setShowAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [attendanceStudent, setAttendanceStudent] = useState<Student | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const activeCount = students.filter((s) => s.active).length;

  const filtered = students.filter((s) => {
    if (filterActive === 'active' && !s.active) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.reg_no.toLowerCase().includes(q) ||
      s.bluetooth_address.toLowerCase().includes(q)
    );
  });

  async function handleDeactivate() {
    if (!deactivateId || !deactivateReason.trim()) return;
    setDeactivating(true);
    try {
      await deactivateStudent(deactivateId, deactivateReason);
      setDeactivateId(null);
      setDeactivateReason('');
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        subtitle={`${activeCount} active ${activeCount === 1 ? 'student' : 'students'} registered in class cohort`}
        action={
          <Button onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </Button>
        }
      />

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, reg, MAC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-slate-800 dark:text-zinc-100"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active / All Filter Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterActive('active')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer',
              filterActive === 'active'
                ? 'bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            )}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterActive('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer',
              filterActive === 'all'
                ? 'bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            )}
          >
            All ({students.length})
          </button>
        </div>
      </div>

      {/* Desktop Table (md and up) */}
      <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Registration No.
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Name
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Bluetooth Address
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Phone Type
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right font-semibold uppercase tracking-wider text-[11px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <EmptyState
                      icon={<Users className="w-6 h-6" />}
                      title={search ? 'No matching students' : 'No students enrolled'}
                      description={
                        search
                          ? 'Try adjusting your search query or clear the filter.'
                          : 'Get started by adding students to this class section.'
                      }
                      actionLabel={search ? undefined : 'Add student'}
                      onAction={search ? undefined : () => setShowAdd(true)}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setAttendanceStudent(s)}
                    className={cn(
                      'hover:bg-orange-50/50 dark:hover:bg-orange-950/20 cursor-pointer transition-colors group',
                      !s.active && 'opacity-60 bg-slate-50/40 dark:bg-zinc-800/40'
                    )}
                  >
                    <td className="px-5 py-3.5 font-mono font-semibold text-orange-600 dark:text-orange-400 group-hover:underline">
                      {s.reg_no}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-zinc-100 group-hover:text-orange-950 dark:group-hover:text-orange-200">
                      {s.name}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 dark:text-zinc-400">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 font-mono text-slate-700 dark:text-zinc-300">
                        {s.bluetooth_address}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-zinc-400">
                      {s.phone_type || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.active ? 'success' : 'neutral'}>
                        {s.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttendanceStudent(s);
                          }}
                          title="View student attendance"
                          className="h-8 px-2.5 text-xs text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:border-orange-300"
                        >
                          <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          <span>Attendance</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStudent(s);
                          }}
                          title="Edit student"
                          className="h-8 px-2.5"
                        >
                          <Pencil className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          <span>Edit</span>
                        </Button>
                        {s.active && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeactivateId(s.id);
                            }}
                            title="Deactivate student"
                            className="h-8 px-2.5"
                          >
                            <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span className="text-rose-600 dark:text-rose-400">Deactivate</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Cards (< 768px) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title={search ? 'No matching students' : 'No students enrolled'}
            description={
              search
                ? 'Try adjusting your search query or clear the filter.'
                : 'Get started by adding students to this class section.'
            }
            actionLabel={search ? undefined : 'Add student'}
            onAction={search ? undefined : () => setShowAdd(true)}
          />
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => setAttendanceStudent(s)}
              className={cn(
                'bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-4.5 shadow-sm space-y-3 cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 transition-all',
                !s.active && 'opacity-60 bg-slate-50/50 dark:bg-zinc-800/50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-zinc-100">
                    {s.name}
                  </div>
                  <div className="font-mono text-xs text-orange-600 dark:text-orange-400 font-semibold mt-0.5">
                    {s.reg_no}
                  </div>
                </div>
                <Badge variant={s.active ? 'success' : 'neutral'}>
                  {s.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Bluetooth:</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                    {s.bluetooth_address}
                  </span>
                </div>
                {s.phone_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Device:</span>
                    <span className="text-slate-800 dark:text-zinc-200">{s.phone_type}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttendanceStudent(s);
                  }}
                  className="border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span>Attendance</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditStudent(s);
                  }}
                  className="text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                {s.active && (
                  <Button
                    size="sm"
                    variant="danger-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeactivateId(s.id);
                    }}
                    className="text-xs"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Deactivate</span>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Student Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Student"
        size="md"
      >
        <StudentForm onClose={() => setShowAdd(false)} />
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        title="Edit Student"
        size="md"
      >
        {editStudent && (
          <StudentForm
            student={editStudent}
            onClose={() => setEditStudent(null)}
          />
        )}
      </Modal>

      {/* Deactivate Student Confirmation Dialog */}
      <Modal
        open={!!deactivateId}
        onClose={() => {
          setDeactivateId(null);
          setDeactivateReason('');
        }}
        title="Deactivate Student"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeactivateId(null);
                setDeactivateReason('');
              }}
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeactivate}
              loading={deactivating}
              disabled={!deactivateReason.trim()}
            >
              Confirm Deactivation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-[#4B5563] dark:text-zinc-300">
            Deactivating this student will exclude them from upcoming attendance probe sessions. Past attendance records are preserved.
          </p>
          <Input
            label="Reason for deactivation"
            placeholder="e.g. Transferred section, medical leave…"
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            required
            autoFocus
          />
        </div>
      </Modal>

      {/* Student Attendance Details Drawer */}
      <StudentAttendanceDrawer
        student={attendanceStudent}
        open={!!attendanceStudent}
        onClose={() => setAttendanceStudent(null)}
      />
    </div>
  );
}
