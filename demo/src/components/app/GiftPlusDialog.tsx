'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { FRIENDS, userById } from '@/lib/mock';
import { GIFTS } from '@/lib/plus';

/**
 * Gift Plus (feature 15): pick a friend (or come in with one), how long, a note, then pay. Gifts are
 * one-off, so card or PromptPay both work. The friend gets a gift card in DMs and the Inbox, and the
 * months add on top of any Plus they already have.
 */
export function GiftPlusDialog({ open, onOpenChange, to }: { open: boolean; onOpenChange: (o: boolean) => void; to?: string }) {
  const router = useRouter();
  const [friend, setFriend] = useState(to ?? FRIENDS[0]!.id);
  const [months, setMonths] = useState<number>(3);
  const [note, setNote] = useState('');
  const who = userById(to ?? friend);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Gift className="size-5 text-primary" /> Gift Plus
          </DialogTitle>
          <DialogDescription>Adds on top of any Plus they already have. Their rooms grow too.</DialogDescription>
        </DialogHeader>

        {!to && (
          <section className="flex flex-col gap-1.5">
            <p className="text-sm font-bold">For</p>
            <div className="flex flex-wrap gap-1.5">
              {FRIENDS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setFriend(u.id)}
                  aria-pressed={friend === u.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm font-bold',
                    friend === u.id ? 'border-primary bg-secondary text-secondary-foreground' : 'hover:bg-muted',
                  )}
                >
                  <UserAvatar user={u} size={24} /> {u.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-1.5">
          <p className="text-sm font-bold">How long</p>
          <div className="grid grid-cols-3 gap-2">
            {GIFTS.map((g) => (
              <button
                key={g.months}
                onClick={() => setMonths(g.months)}
                aria-pressed={months === g.months}
                className={cn(
                  'flex flex-col items-center rounded-2xl border-2 p-2.5',
                  months === g.months ? 'border-primary bg-secondary/60' : 'border-transparent bg-muted/60 hover:border-border',
                )}
              >
                <span className="font-black">
                  {g.months} month{g.months > 1 && 's'}
                </span>
                <span className="text-xs text-muted-foreground">฿{g.price}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-1.5">
          <label htmlFor="gift-note" className="text-sm font-bold">
            A note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="gift-note"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
            placeholder="for the Big map, thanks for hosting 🫶"
            className="rounded-xl"
          />
        </section>

        <p className="-mb-1 rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {who.plus
            ? `${who.name} already has Plus, so this adds ${months} month${months > 1 ? 's' : ''} on top: their next payment moves back by that much.`
            : `${who.name} gets Plus right away, for ${months} month${months > 1 ? 's' : ''}. It doesn’t renew by itself.`}
        </p>
        <Button
          className="rounded-full font-extrabold"
          onClick={() => {
            const q = new URLSearchParams({ gift: who.id, months: String(months) });
            if (note.trim()) q.set('note', note.trim());
            router.push(`/checkout?${q}`);
          }}
        >
          Continue to payment · ฿{GIFTS.find((g) => g.months === months)!.price}
        </Button>
        <p className="-mt-2 text-center text-[11px] text-muted-foreground">Card or PromptPay. Gifts can’t be refunded once received.</p>
      </DialogContent>
    </Dialog>
  );
}
