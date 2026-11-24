'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Printer } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const METHOD = { card: 'Card', promptpay: 'PromptPay' } as const;
const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * One receipt (Settings → Plus & billing → Receipt), opened in its own tab. Print saves it as a PDF
 * through the browser, so there's no PDF to build or store; the print styles hide the buttons.
 */
export default function ReceiptPage({ params }: PageProps<'/receipt/[id]'>) {
  const { id } = use(params);
  const { data: r, isPending } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => (await api.GET('/api/billing/receipts/{id}', { params: { path: { id } } })).data ?? null,
  });

  if (isPending)
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  if (!r)
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-black">We can’t find that receipt</p>
          <p className="text-sm text-muted-foreground">Receipts open for the account that paid. Signed in as someone else?</p>
          <Button asChild className="rounded-full font-bold">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </main>
    );

  return (
    <main className="min-h-dvh bg-muted/40 px-4 py-10 print:bg-white print:p-0">
      <article className="mx-auto max-w-lg rounded-[2rem] border bg-card p-8 shadow-soft print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4">
          <Logo />
          <div className="text-right">
            <p className="text-xl font-black">Receipt</p>
            <p className="font-mono text-xs text-muted-foreground">{r.id}</p>
          </div>
        </header>

        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Date</dt>
          <dd className="font-semibold">{when(r.at)}</dd>
          <dt className="text-muted-foreground">Billed to</dt>
          <dd className="font-semibold">
            {r.name}
            {r.email && <span className="block font-normal text-muted-foreground">{r.email}</span>}
          </dd>
          <dt className="text-muted-foreground">Paid with</dt>
          <dd className="font-semibold">{METHOD[r.method]}</dd>
        </dl>

        <div className="mt-8 flex items-center justify-between border-y py-4">
          <span className="font-semibold">{r.what}</span>
          <span className="font-mono">฿{r.amount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between py-4 text-lg font-black">
          <span>Total paid</span>
          <span className={cn('font-mono', r.refundedAt && 'text-muted-foreground line-through')}>฿{r.amount.toLocaleString()}</span>
        </div>
        {r.refundedAt && <p className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold">Refunded in full on {when(r.refundedAt)}.</p>}

        <p className="mt-6 text-xs text-muted-foreground">
          Thank you for supporting Connecta ✨ Something wrong? Reply to your receipt email and the team will sort it out.
        </p>

        <div className="mt-8 flex justify-end print:hidden">
          <Button className="rounded-full font-bold" onClick={() => window.print()}>
            <Printer className="size-4" /> Print or save as PDF
          </Button>
        </div>
      </article>
    </main>
  );
}
