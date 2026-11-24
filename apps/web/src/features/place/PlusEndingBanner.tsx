'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useMyRooms } from '@/features/rooms/useRooms';
import { resumePlus, usePlus } from '@/lib/plus';

/**
 * Home's heads-up when Plus is running out (docs/features/15-plus.md), so an owner hears it before their rooms
 * shrink: once cancelled (Plus until the date), and during the 7-day grace after it ends (rooms keep
 * their space, then go back to 25 at once and Big maps switch to Cosy). Nothing is deleted, and
 * nobody inside is sent out.
 */
const BUTTON = 'flex-none rounded-full bg-card px-4 py-2 text-sm font-extrabold text-foreground shadow-sm hover:bg-muted';

export function PlusEndingBanner() {
  const plus = usePlus();
  const rooms = useMyRooms();
  if (plus.state !== 'cancelled' && plus.state !== 'grace') return null;
  const grace = plus.state === 'grace';
  const owned = (rooms.data ?? []).filter((r) => r.me.role === 'owner');
  const big = owned.some((r) => r.size === 'big');
  const which = owned.length === 1 ? owned[0]!.name : 'your rooms';
  const then = owned.length
    ? `Then ${which} ${owned.length === 1 ? 'goes' : 'go'} back to 25 people at once${big ? ' and Big maps switch to Cosy' : ''}. Nothing is deleted.`
    : 'Get it again any time.';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-peach p-4 text-peach-ink">
      <Crown className="size-6 flex-none" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="block font-black">
          {grace
            ? owned.length
              ? `Plus ended · ${owned.length === 1 ? `${which} keeps its` : 'your rooms keep their'} space for ${plus.graceLeft} more day${plus.graceLeft > 1 ? 's' : ''}`
              : 'Your Plus has ended'
            : `Your Plus ends on ${plus.date}`}
        </span>
        {grace ? then : `After that your rooms keep their space for 7 days. Turn renewal back on any time.`}
      </p>
      {grace ? (
        <Link href="/home/plus" className={BUTTON}>
          Get Plus again
        </Link>
      ) : (
        <button
          onClick={async () => {
            if (await resumePlus()) toast.success('Plus will renew again ✨');
          }}
          className={BUTTON}
        >
          Keep Plus
        </button>
      )}
    </div>
  );
}
