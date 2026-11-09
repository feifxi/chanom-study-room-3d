'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import { toast } from 'sonner';
import { resumePlus, usePlus } from '@/lib/plus';

/**
 * Home's heads-up when Plus is running out (feature 15), so an owner hears it before their room
 * shrinks: once cancelled (Plus until the date), and during the 7-day grace after it ends (rooms keep
 * their space, then go back to 25 at once and Big or premium maps switch to the basic version).
 * PromptPay packs show the cancelled state from 7 days before they end, since they never renew.
 */
const BUTTON = 'flex-none rounded-full bg-card px-4 py-2 text-sm font-extrabold text-foreground shadow-sm hover:bg-muted';

export function PlusEndingBanner() {
  const plus = usePlus();
  if (plus.state !== 'cancelled' && plus.state !== 'grace') return null;
  const grace = plus.state === 'grace';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-peach p-4 text-peach-ink">
      <Crown className="size-6 flex-none" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="block font-black">
          {grace ? `Plus ended · your rooms keep their space for ${plus.graceLeft} more days` : `Your Plus ends on ${plus.date}`}
        </span>
        {grace
          ? 'Then Chanom Friends goes back to 25 at once and its Big map switches to the Cosy one. Nothing is deleted.'
          : 'After that your rooms keep their space for 7 days. Turn renewal back on any time.'}
      </p>
      {grace ? (
        <Link href="/home/plus" className={BUTTON}>
          Get Plus again
        </Link>
      ) : (
        <button
          onClick={() => {
            resumePlus();
            toast.success('Plus will renew again ✨');
          }}
          className={BUTTON}
        >
          Keep Plus
        </button>
      )}
    </div>
  );
}
