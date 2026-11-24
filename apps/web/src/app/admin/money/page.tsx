'use client';

import { useState } from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { whenShort } from '@/features/admin/auditLabels';
import { useAdminMoney, useRefund, type AdminPayment, type PaymentFilter, type RefundReason } from '@/features/admin/useAdmin';
import { problem } from '@/features/rooms/useRooms';

const FILTERS: [PaymentFilter, string][] = [
  ['all', 'All'],
  ['refunded', 'Refunded'],
  ['gifts', 'Gifts'],
];
const REFUND_REASONS: RefundReason[] = ['Charged twice', 'Renewed by mistake (within 48 h)', 'A bug on our side', 'Something else'];

/**
 * Money (docs/features/15-plus.md): what Plus brings in against Stripe's fees, how people pay, and every payment.
 * Refunds happen only here, by hand, for real mistakes (charged twice, a renewal asked about within
 * 48 hours, a bug): the money goes back, the person gets an email and it goes in the audit log.
 */
export default function MoneyPage() {
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const [refunding, setRefunding] = useState<string | null>(null);
  const { data } = useAdminMoney(filter);
  const refund = useRefund();
  const total = data?.mix.reduce((n, p) => n + p.people, 0) ?? 0;

  const give = (p: AdminPayment, reason: RefundReason) =>
    refund.mutate(
      { id: p.id, reason },
      {
        onSuccess: () => {
          setRefunding(null);
          toast.success(`Refunded ฿${p.amount}${p.who?.handle ? ` to @${p.who.handle}` : ''}. They got an email; it’s in the audit log.`);
        },
        onError: (e) => toast.error(problem(e)),
      },
    );

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle
        title="Money"
        note={
          data
            ? data.stripe
              ? 'Connecta Plus through Stripe · amounts in baht'
              : 'Local stand-in payments (no Stripe keys) · amounts in baht'
            : 'Loading…'
        }
      >
        {data?.stripe && (
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            Stripe dashboard ↗
          </a>
        )}
      </AdminTitle>
      {data && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.stats.map((s) => (
              <div key={s.label} className="rounded-3xl border bg-card p-4">
                <p className="text-xs font-bold text-muted-foreground">{s.label}</p>
                <p className={cn('text-2xl font-black', s.warn && 'text-peach-ink')}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.note}</p>
              </div>
            ))}
          </div>

          <section className="mb-6 rounded-3xl border bg-card p-4">
            <p className="mb-3 text-sm font-black">How Plus members pay</p>
            <div className="flex flex-col gap-2.5">
              {data.mix.map((p) => (
                <div key={p.plan} className="grid grid-cols-[9rem_1fr_6rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_8rem]">
                  <span className="font-bold">{p.plan}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(p.people / total) * 100}%` }} />
                  </span>
                  <span className="text-right font-mono text-xs">
                    {p.people} · ฿{p.mrr.toLocaleString('en')}/mo
                  </span>
                </div>
              ))}
              {!data.mix.length && <p className="text-sm text-muted-foreground">No paid plans yet (gifts aren’t plans).</p>}
            </div>
          </section>
        </>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-black">Payments</p>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn('rounded-full px-3 py-1 text-xs font-bold', filter === id ? 'bg-primary text-primary-foreground' : 'bg-muted')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">What</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.payments.map((p) => (
              <tr key={p.id} className="border-b align-top last:border-0">
                <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">{whenShort(p.at)}</td>
                <td className="px-3 py-2 font-bold whitespace-nowrap">
                  {p.who ? (p.who.handle ? `@${p.who.handle}` : p.who.name) : 'A deleted account'}
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    {p.method === 'card' ? (
                      <CreditCard className="size-3.5 flex-none text-muted-foreground" aria-label="Card" />
                    ) : (
                      <QrCode className="size-3.5 flex-none text-muted-foreground" aria-label="PromptPay" />
                    )}
                    {p.what}
                  </span>
                  {p.refund && (
                    <span className="block text-xs text-muted-foreground">
                      {p.refund.reason} · by {p.refund.by} · {whenShort(p.refund.at)}
                    </span>
                  )}
                  {refunding === p.id && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {REFUND_REASONS.map((r) => (
                        <button
                          key={r}
                          disabled={refund.isPending}
                          onClick={() => give(p, r)}
                          className="rounded-full border px-2.5 py-1 text-xs font-bold hover:bg-muted"
                        >
                          {r}
                        </button>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">฿{p.amount.toLocaleString('en')}</td>
                <td className="px-3 py-2">
                  <Pill tone={p.status === 'paid' ? 'ok' : 'muted'}>{p.status}</Pill>
                </td>
                <td className="px-3 py-2 text-right">
                  {p.refundable && (
                    <button
                      onClick={() => setRefunding(refunding === p.id ? null : p.id)}
                      className="rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap hover:bg-muted"
                    >
                      {refunding === p.id ? 'Cancel' : 'Refund…'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.payments.length && <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Refunds only for real mistakes; users have no refund button. A refund gives the money back and leaves their Plus as it is. Gifts
        can’t be refunded once received.
      </p>
    </div>
  );
}
