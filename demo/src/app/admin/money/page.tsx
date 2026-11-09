'use client';

import { useState } from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { MONEY_STATS, PAYMENTS, PLAN_MIX, REFUND_REASONS, type Payment, type PaymentStatus } from '@/features/admin/adminData';

const TONE: Record<PaymentStatus, 'ok' | 'warn' | 'bad' | 'muted'> = { paid: 'ok', retrying: 'warn', failed: 'bad', refunded: 'muted' };
const FILTERS = ['All', 'Needs a look', 'Refunded'] as const;

/**
 * Money (feature 15): what Plus brings in against fees and the server bill, how people pay, and every
 * payment. Refunds happen only here, by hand, for real mistakes (charged twice, a renewal asked
 * about within 48 hours, a bug): the person gets an email and it goes in the audit log. Failed
 * renewals are Stripe's to retry (4 tries); after the last one Plus ends and grace starts.
 */
export default function MoneyPage() {
  const [payments, setPayments] = useState(PAYMENTS);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [refunding, setRefunding] = useState<string | null>(null);
  const shown = payments.filter(
    (p) => filter === 'All' || (filter === 'Refunded' ? p.status === 'refunded' : p.status !== 'paid' || !!p.note),
  );
  const total = PLAN_MIX.reduce((n, p) => n + p.people, 0);

  const refund = (p: Payment, reason: string) => {
    setPayments((all) => all.map((x) => (x.id === p.id ? { ...x, status: 'refunded', note: reason } : x)));
    setRefunding(null);
    toast.success(`Refunded ฿${p.amount} to @${p.who}. They got an email; it’s in the audit log.`);
  };

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle title="Money" note="Connecta Plus through Stripe · amounts in baht">
        <button
          onClick={() => toast('Demo: opens the Stripe dashboard')}
          className="rounded-full border px-3 py-1.5 text-xs font-bold hover:bg-muted"
        >
          Stripe dashboard ↗
        </button>
      </AdminTitle>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MONEY_STATS.map((s) => (
          <div key={s.label} className="rounded-3xl border bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground">{s.label}</p>
            <p className={cn('text-2xl font-black', s.tone === 'warn' && 'text-peach-ink')}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-3xl border bg-card p-4">
        <p className="mb-3 text-sm font-black">How people pay</p>
        <div className="flex flex-col gap-2.5">
          {PLAN_MIX.map((p) => (
            <div key={p.plan} className="grid grid-cols-[9rem_1fr_6rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_8rem]">
              <span className="font-bold">{p.plan}</span>
              <span className="h-3 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(p.people / total) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs">
                {p.people} · ฿{p.mrr.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-black">Payments</p>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('rounded-full px-3 py-1 text-xs font-bold', filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted')}
          >
            {f}
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
            {shown.map((p) => (
              <tr key={p.id} className="border-b align-top last:border-0">
                <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">{p.at}</td>
                <td className="px-3 py-2 font-bold whitespace-nowrap">@{p.who}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    {p.method === 'card' ? (
                      <CreditCard className="size-3.5 flex-none text-muted-foreground" aria-label="Card" />
                    ) : (
                      <QrCode className="size-3.5 flex-none text-muted-foreground" aria-label="PromptPay" />
                    )}
                    {p.what}
                  </span>
                  {p.note && <span className="block text-xs text-muted-foreground">{p.note}</span>}
                  {refunding === p.id && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {REFUND_REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => refund(p, r)}
                          className="rounded-full border px-2.5 py-1 text-xs font-bold hover:bg-muted"
                        >
                          {r}
                        </button>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">฿{p.amount}</td>
                <td className="px-3 py-2">
                  <Pill tone={TONE[p.status]}>{p.status}</Pill>
                </td>
                <td className="px-3 py-2 text-right">
                  {p.status === 'paid' && (
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
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Refunds only for real mistakes; users have no refund button. Gifts can’t be refunded once received.
      </p>
    </div>
  );
}
