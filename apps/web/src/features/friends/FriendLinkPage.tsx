'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonFace } from '@/components/PersonFace';
import { useMe } from '@/features/account/useMe';
import { problem } from '@/features/rooms/useRooms';
import { friendsApi, useFriendAction, type Friend } from './useFriends';

/**
 * A friend link. One tap sends the request (not on opening: a link preview or a stray click
 * shouldn't send anything). Signed-out people sign in and come back here.
 */
export function FriendLinkPage({ handle }: { handle: string }) {
  const { data: me, isPending } = useMe();
  const [done, setDone] = useState<{ ok: boolean; text: string; who?: Friend['person'] } | null>(null);
  const add = useFriendAction(
    friendsApi.add,
    (r) =>
      setDone({
        ok: true,
        who: r.person,
        text:
          r.status === 'friends'
            ? `You and ${r.person.name} are friends now 💖`
            : `Request sent to ${r.person.name}. You’ll be friends once they say yes.`,
      }),
    true,
  );
  const account = !!me && !me.isGuest && me.signedUp;

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-secondary via-peach to-lavender p-6">
      <div className="panel flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
        {done?.who ? <PersonFace who={done.who} size={64} /> : <span className="text-5xl">🫶</span>}
        <div>
          <p className="text-sm font-black tracking-wider text-primary uppercase">Friend link</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Be friends with @{handle}?</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Friends can message each other and see which room they’re in.</p>
        </div>
        {done ? (
          <p className={done.ok ? 'text-sm font-semibold text-mint-ink' : 'text-sm font-semibold text-destructive'}>
            {done.ok && <Check className="mr-1 inline size-4" />}
            {done.text}
          </p>
        ) : isPending ? null : account ? (
          <Button
            className="h-11 w-full rounded-2xl font-extrabold"
            disabled={add.isPending}
            onClick={() => add.mutate(handle, { onError: (error) => setDone({ ok: false, text: problem(error) }) })}
          >
            <UserPlus /> Send a friend request
          </Button>
        ) : (
          <Button asChild className="h-11 w-full rounded-2xl font-extrabold">
            <Link href={`/login?new=1&next=${encodeURIComponent(`/f/${handle}`)}`}>
              <LogIn /> Join Connecta to add them
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="rounded-full font-bold">
          <Link href={account ? '/home/friends' : '/'}>{account ? 'Go to Friends' : 'What’s Connecta?'}</Link>
        </Button>
      </div>
    </div>
  );
}
