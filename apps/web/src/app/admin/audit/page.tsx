'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { actionLabel, whenShort } from '@/features/admin/auditLabels';
import { useAuditLog } from '@/features/admin/useAdmin';

/** Who did what: every team action and every automatic step, newest first. Read-only. */
export default function AuditPage() {
  const [who, setWho] = useState<'all' | 'team' | 'auto'>('all');
  const log = useAuditLog(who);
  const entries = log.data?.pages.flatMap((p) => p.entries) ?? [];
  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <AdminTitle title="Audit log" note="Every team action and automatic step. Nobody can edit it.">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(['all', 'team', 'auto'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWho(w)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold capitalize',
                who === w ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
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
            {entries.map((a) => (
              <tr key={a.id} className="border-b align-top last:border-0">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{whenShort(a.at)}</td>
                <td className="px-3 py-2">
                  <Pill tone={a.by ? 'muted' : 'info'}>{a.by ?? 'Auto'}</Pill>
                </td>
                <td className="px-3 py-2 font-bold">
                  {actionLabel(a.action)}
                  {a.details && <span className="block text-xs font-normal text-muted-foreground">{a.details}</span>}
                </td>
                <td className="px-3 py-2">{a.target}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{a.reason || '·'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {log.data && !entries.length && <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>}
      </div>
      {log.hasNextPage && (
        <Button
          variant="outline"
          disabled={log.isFetchingNextPage}
          className="mt-3 rounded-full font-bold"
          onClick={() => void log.fetchNextPage()}
        >
          Older
        </Button>
      )}
    </div>
  );
}
