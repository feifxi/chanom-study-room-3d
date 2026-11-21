'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { AUDIT } from '@/features/admin/adminData';

/** Who did what: every team action and every automatic step, kept for a year. Read-only. */
export default function AuditPage() {
  const [who, setWho] = useState<'All' | 'Team' | 'Auto'>('All');
  const shown = AUDIT.filter((a) => who === 'All' || (who === 'Auto' ? a.who === 'Auto' : a.who !== 'Auto'));
  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <AdminTitle title="Audit log" note="Every team action and automatic step. Kept for a year; nobody can edit it.">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(['All', 'Team', 'Auto'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWho(w)}
              className={cn('rounded-full px-3 py-1 text-xs font-extrabold', who === w ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              {w}
            </button>
          ))}
        </div>
      </AdminTitle>
      <div className="overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">On</th>
              <th className="px-3 py-2">Why</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.at + a.target + a.action} className="border-b last:border-0">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{a.at}</td>
                <td className="px-3 py-2">
                  <Pill tone={a.who === 'Auto' ? 'info' : 'muted'}>{a.who}</Pill>
                </td>
                <td className="px-3 py-2 font-bold">{a.action}</td>
                <td className="px-3 py-2">{a.target}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{a.reason ?? '·'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
