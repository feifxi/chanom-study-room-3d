'use client';

import { useRouter } from 'next/navigation';
import { Sprout } from 'lucide-react';
import { MIN_AGE } from '@connecta/shared';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { clearGuest } from '@/lib/guest';
import { cn } from '@/lib/utils';
import { useSetMe } from './useMe';

/**
 * The guest door's age question: Connecta is 13+ for guests too. Neither answer is picked for you
 * (a neutral question), and under 13 locks this browser for a day, like sign-up's birthday step.
 */
export function GuestAge({ value, onChange }: { value: boolean | null; onChange: (over13: boolean) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-muted-foreground">How old are you?</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How old are you?">
        {[
          [false, `Under ${MIN_AGE}`],
          [true, `${MIN_AGE} or older`],
        ].map(([v, label]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v as boolean)}
            className={cn(
              'h-10 rounded-xl border text-sm font-bold',
              value === v ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Shown instead of the guest form once the API says too young (403 too_young) */
export function GuestTooYoung() {
  const router = useRouter();
  const setMe = useSetMe();
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl bg-muted/60 p-6 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-mint text-mint-ink">
        <Sprout className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-[-0.03em]">Come back when you’re {MIN_AGE}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connecta is for people {MIN_AGE} and older. We’ll keep a cosy spot for you until then 🌱
        </p>
      </div>
      <Button
        variant="outline"
        className="h-11 rounded-2xl px-6 font-bold"
        onClick={async () => {
          await authClient.signOut();
          clearGuest();
          setMe(null);
          router.push('/');
        }}
      >
        Back to the start
      </Button>
    </div>
  );
}

/** The API's "too young" answer */
export const isTooYoung = (error: unknown) => (error as { code?: string } | undefined)?.code === 'too_young';
