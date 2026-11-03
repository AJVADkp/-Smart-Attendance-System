'use client';
import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTimeIST } from '@/lib/utils';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  X,
  FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditRecord {
  id: string;
  actor?: string;
  actor_email?: string;
  action?: string;
  entity: string;
  entity_id?: string | null;
  field?: string | null;
  old_value?: any;
  new_value?: any;
  reason?: string | null;
  created_at: string;
  at?: string;
}

function parseValue(val: any): { isObject: boolean; parsed: any } {
  if (val === null || val === undefined || val === '') {
    return { isObject: false, parsed: '—' };
  }
  if (typeof val === 'object') {
    return { isObject: true, parsed: val };
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object') {
        return { isObject: true, parsed };
      }
      return { isObject: false, parsed: String(parsed) };
    } catch {
      return { isObject: false, parsed: val };
    }
  }
  return { isObject: false, parsed: String(val) };
}

function ValueDisplay({ value }: { value: any }) {
  const { isObject, parsed } = parseValue(value);
  if (!isObject) {
    return <span className="font-mono text-xs">{String(parsed)}</span>;
  }
  return (
    <div className="space-y-1 text-xs font-mono bg-[#FFF7ED]/70 dark:bg-zinc-800/60 p-2.5 rounded-[8px] border border-[#FED7AA]/60 dark:border-zinc-700 max-w-md">
      {Object.entries(parsed).map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-2">
          <span className="text-[#6B7280] dark:text-zinc-400 font-sans text-[11px] font-semibold">{k}:</span>
          <span className="text-[#1F2937] dark:text-zinc-100 text-right truncate">
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AuditLogClient({ logs }: { logs: AuditRecord[] }) {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const entities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.entity) set.add(l.entity);
    });
    return Array.from(set);
  }, [logs]);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (entityFilter !== 'all' && l.entity !== entityFilter) return false;
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const actor = (l.actor || l.actor_email || '').toLowerCase();
      const entity = l.entity.toLowerCase();
      const reason = (l.reason || '').toLowerCase();
      const field = (l.field || '').toLowerCase();
      const newV = typeof l.new_value === 'string' ? l.new_value.toLowerCase() : JSON.stringify(l.new_value || '').toLowerCase();
      return (
        actor.includes(q) ||
        entity.includes(q) ||
        reason.includes(q) ||
        field.includes(q) ||
        newV.includes(q)
      );
    });
  }, [logs, entityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRecords = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable tamper-evident record of all administrative changes and system actions"
      />

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-4 shadow-edis flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-zinc-400" />
          <input
            type="text"
            placeholder="Search actor, entity, reason…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 placeholder:text-[#6B7280] dark:placeholder:text-zinc-500 focus:border-[#F97316] dark:focus:border-orange-500 focus:ring-2 focus:ring-[#F97316]/20 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-zinc-400 hover:text-[#1F2937] dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280] dark:text-zinc-400 font-medium hidden sm:inline">
            Entity:
          </span>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#1F2937] dark:text-zinc-100 focus:outline-[#F97316] cursor-pointer"
          >
            <option value="all">All Entities ({logs.length})</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 shadow-edis overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FFF7ED]/70 dark:bg-zinc-800/80 border-b border-[#FED7AA] dark:border-zinc-700 text-[#1F2937] dark:text-zinc-100">
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  When
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Actor
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Entity
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Field
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Changes
                </th>
                <th className="px-5 py-3.5 font-semibold uppercase tracking-wider text-[11px]">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FED7AA]/30 dark:divide-zinc-800">
              {pagedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280] dark:text-zinc-400">
                    <EmptyState
                      icon={<ShieldCheck className="w-6 h-6" />}
                      title="No matching audit entries"
                      description="No administrative events matched your filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                pagedRecords.map((l) => {
                  const timestamp = l.created_at || l.at || '';
                  const timeFormatted = formatDateTimeIST(timestamp);
                  const actorEmail = (l.actor_email || l.actor || 'system').replace(/@edis\.com$/i, '@school.edu');
                  const isExpanded = expandedRows.has(l.id);
                  const { isObject: isNewObj } = parseValue(l.new_value);

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-[#FFF7ED]/30 dark:hover:bg-zinc-800/40 transition-colors align-top"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-[#6B7280] dark:text-zinc-400">
                        {timeFormatted}
                      </td>
                      <td className="px-5 py-3.5 text-[#1F2937] dark:text-zinc-100 font-medium">
                        {actorEmail}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="orange">{l.entity}</Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#EA580C] dark:text-orange-400">
                        {l.field || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {isNewObj ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleRow(l.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EA580C] dark:text-orange-400 hover:underline cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="mt-2">
                                <ValueDisplay value={l.new_value} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {l.old_value && (
                              <div className="text-[#9CA3AF] dark:text-zinc-500 line-through text-[11px]">
                                {String(l.old_value)}
                              </div>
                            )}
                            <div className="font-semibold text-[#1F2937] dark:text-zinc-100">
                              {String(l.new_value ?? '—')}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#4B5563] dark:text-zinc-300 text-xs leading-relaxed min-w-[260px] max-w-[420px] break-words">
                        {l.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Cards (< 768px) */}
      <div className="md:hidden space-y-3">
        {pagedRecords.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="No matching audit entries"
            description="No administrative events matched your filter criteria."
          />
        ) : (
          pagedRecords.map((l) => {
            const timestamp = l.created_at || l.at || '';
            const timeFormatted = formatDateTimeIST(timestamp);
            const actorEmail = (l.actor_email || l.actor || 'system').replace(/@edis\.com$/i, '@school.edu');
            const isExpanded = expandedRows.has(l.id);

            return (
              <div
                key={l.id}
                className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-4 shadow-edis space-y-2.5 text-xs transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="orange">{l.entity}</Badge>
                  <span className="text-[#9CA3AF] dark:text-zinc-500 font-mono text-[11px]">
                    {timeFormatted}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#1F2937] dark:text-zinc-100">
                  <span className="text-[#6B7280] dark:text-zinc-400">Actor:</span>
                  <span className="font-medium">{actorEmail}</span>
                </div>

                {l.field && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] dark:text-zinc-400">Field:</span>
                    <span className="font-mono text-[#EA580C] dark:text-orange-400">{l.field}</span>
                  </div>
                )}

                {l.reason && (
                  <div className="flex items-start justify-between gap-2 pt-2 border-t border-[#FED7AA]/40 dark:border-zinc-800">
                    <span className="text-[#6B7280] dark:text-zinc-400">Reason:</span>
                    <span className="text-[#1F2937] dark:text-zinc-100 text-right font-medium">
                      {l.reason}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#FED7AA]/40 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => toggleRow(l.id)}
                    className="w-full flex items-center justify-between text-[11px] font-semibold text-[#EA580C] dark:text-orange-400 py-1 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide changes' : 'Show changes'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="mt-2">
                      <ValueDisplay value={l.new_value} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paging Footer (25 rows per page) */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 shadow-edis text-xs transition-colors">
          <span className="text-[#6B7280] dark:text-zinc-400">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}{' '}
            events
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>
            <span className="text-xs font-semibold px-2 text-[#1F2937] dark:text-zinc-100">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
