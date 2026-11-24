'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, DoorOpen, Lock, LogIn, UserPlus } from 'lucide-react';
import type { AvatarLook } from '@connecta/shared';
import { DISPLAY_NAME_MAX } from '@connecta/shared';
import { toast } from 'sonner';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { fetchMe, useMe, useSetMe } from '@/features/account/useMe';
import { mapFor } from '@/features/place/model';
import { api } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';
import { GUEST_LOOK, saveGuest } from '@/lib/guest';
import { RoomShot, SplitScreen } from '@/components/app/SplitScreen';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { problem, roomsApi } from './useRooms';

/**
 * What someone sees when they open a link (feature 3):
 * - **Member invite** (/i/<code>): join the room. Needs an account, so signed-out people sign in
 *   and come back here.
 * - **Guest pass** (/g/<code>): walk into the room for 24 hours. No account needed: pick a name and
 *   a character and you're in (a guest who signs up later keeps the character). Signed in, you just
 *   walk in as yourself.
 */
export function InvitePage({ code, kind }: { code: string; kind: 'member' | 'guest' }) {
  const router = useRouter();
  const { data: me, isPending: meLoading } = useMe();
  const setMe = useSetMe();
  const invite = useQuery({ queryKey: ['invite', code], queryFn: () => roomsApi.preview(code), retry: false });
  const [name, setName] = useState('');
  const [look, setLook] = useState<AvatarLook>(GUEST_LOOK);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const here = `/${kind === 'guest' ? 'g' : 'i'}/${code}`;

  const p = invite.data;
  // A link of the other kind pasted under the wrong path still works as what it really is
  const real = p?.kind ?? kind;
  const account = !!me && !me.isGuest && me.signedUp;

  /** Uses the link, then goes in: the room's page for a new member, 3D for a guest pass. */
  const accept = async () => {
    setBusy(true);
    try {
      const done = await roomsApi.accept(code);
      router.push(real === 'guest' ? `/r/${done.roomId}/walk` : `/r/${done.roomId}`);
    } catch (error) {
      setBusy(false);
      toast.error(problem(error, 'Couldn’t let you in. Try again?'));
    }
  };

  const walkInAsGuest = async () => {
    const guestName = name.trim() || 'Guest';
    setBusy(true);
    try {
      // A guest is a real (temporary) session, so signing up later keeps this name and character
      let current = await fetchMe();
      if (!current) {
        const { error } = await authClient.signIn.anonymous();
        if (error) throw error;
      }
      const { data, error } = await api.PUT('/api/me/guest', { body: { name: guestName, look } });
      // A name with a blocked word says so (feature 14)
      if (!data) throw new Error(problem(error, 'guest profile'));
      current = data;
      setMe(current);
      saveGuest({ name: guestName, look });
    } catch (err) {
      setBusy(false);
      const why = err instanceof Error ? err.message : '';
      toast.error(why.includes('allow') ? why : 'Couldn’t let you in. Try again?');
      return;
    }
    await accept();
  };

  if (invite.isError) return <DeadLink />;
  if (!p || meLoading) {
    return (
      <div className="grid h-dvh place-items-center">
        <p className="animate-pulse font-black text-muted-foreground">Opening your invite… 💌</p>
      </div>
    );
  }

  const map = mapFor(p.room.mapId);
  const expires = p.expiresAt && new Date(p.expiresAt);
  const by = p.by?.name ?? 'Someone';

  return (
    <SplitScreen
      aside={
        <>
          <div>
            <p className="text-sm font-black tracking-wider text-primary uppercase">You’re invited</p>
            <h2 className="mt-2 text-5xl leading-[1.02] font-black tracking-[-0.04em] text-balance">
              {p.room.emoji} {p.room.name}
            </h2>
            <p className="mt-3 max-w-md text-lg">{p.room.description || map.blurb}</p>
          </div>
          <RoomShot
            chips={[
              {
                text: (
                  <>
                    {map.emoji} {map.name}
                  </>
                ),
                className: '-top-4 -left-4 rotate-[-3deg]',
              },
              { text: <>💬 “come sit with us!”</>, className: '-right-4 bottom-8 rotate-[3deg]' },
            ]}
          />
        </>
      }
    >
      <div className="overflow-hidden rounded-[2rem] border bg-card shadow-soft">
        {p.room.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived storage link
          <img src={p.room.thumbnail} alt="" className="h-32 w-full object-cover" />
        ) : (
          <div className={`grid h-32 place-items-center text-6xl ${map.tint}`}>{p.room.emoji}</div>
        )}
        <div className="flex flex-col gap-5 p-6">
          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-muted-foreground">
              {p.by && <UserAvatar user={{ name: by, color: p.by.look?.outfit ?? '#9c8aa0', presence: 'offline' }} size={22} />}
              {by} {real === 'guest' ? 'gave you a guest pass to' : 'invited you to'}
            </p>
            <h1 className="text-2xl font-black tracking-[-0.03em]">
              {p.room.emoji} {p.room.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {map.emoji} {map.name} · {p.room.memberCount} {p.room.memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>

          {p.member ? (
            <Button asChild className="h-11 rounded-2xl font-extrabold">
              <Link href={`/r/${p.room.id}`}>
                <DoorOpen /> You’re in already · open the room
              </Link>
            </Button>
          ) : real === 'member' ? (
            account ? (
              <Button onClick={accept} disabled={busy} className="h-11 rounded-2xl font-extrabold">
                <UserPlus /> Join {p.room.name}
              </Button>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Members find the room on their Home and have its chat any time. It takes a minute.
                </p>
                <Button asChild className="h-11 rounded-2xl font-extrabold">
                  <Link href={`/login?next=${encodeURIComponent(here)}`}>
                    <LogIn /> Sign in to join
                  </Link>
                </Button>
              </>
            )
          ) : !p.room.allowGuests ? (
            <p className="rounded-2xl bg-muted p-3 text-center text-sm">
              This room isn’t taking guests right now. Ask {by} for a member invite.
            </p>
          ) : account ? (
            <Button onClick={accept} disabled={busy} className="h-11 rounded-2xl font-extrabold">
              <DoorOpen /> Walk in as {me.name}
            </Button>
          ) : (
            <>
              {picking ? (
                <form
                  className="flex flex-col gap-4 rounded-3xl bg-muted/60 p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void walkInAsGuest();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPicking(false)}
                    className="flex w-fit items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" /> Back
                  </button>
                  <p className="font-extrabold">Pick how you look</p>
                  <CharacterEditor look={look} onChange={setLook} previewClassName="h-44 w-32">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="guest-name" className="text-xs font-bold text-muted-foreground">
                        Your name
                      </Label>
                      <Input
                        id="guest-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Guest"
                        maxLength={DISPLAY_NAME_MAX}
                        className="rounded-xl bg-card"
                      />
                    </div>
                  </CharacterEditor>
                  <Button type="submit" disabled={busy} className="h-11 rounded-2xl font-extrabold">
                    <DoorOpen /> Walk in
                  </Button>
                </form>
              ) : (
                <form
                  className="flex flex-col gap-2 rounded-3xl bg-muted/60 p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPicking(true);
                  }}
                >
                  <p className="flex items-center gap-1.5 font-extrabold">
                    <DoorOpen className="size-4 text-primary" /> Walk in as a guest
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No account needed. You can listen and type in Bubbles, but not talk, send photos or share your screen, and you won’t see
                    the saved room chat.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      maxLength={DISPLAY_NAME_MAX}
                      className="h-11 rounded-2xl bg-card"
                    />
                    <Button type="submit" className="h-11 rounded-2xl px-5 font-extrabold">
                      Next
                    </Button>
                  </div>
                </form>
              )}
              <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button asChild variant="outline" className="h-11 rounded-2xl font-bold">
                <Link href={`/login?next=${encodeURIComponent(here)}`}>
                  <Lock /> Sign in and walk in as yourself
                </Link>
              </Button>
            </>
          )}

          {expires && (
            <p className="text-center text-xs text-muted-foreground">
              This {real === 'guest' ? 'guest pass' : 'link'} works until{' '}
              {expires.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
            </p>
          )}
        </div>
      </div>
    </SplitScreen>
  );
}

/** Cancelled, expired or mistyped: say so kindly, with somewhere to go. */
function DeadLink() {
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-secondary via-peach to-lavender p-6">
      <div className="panel max-w-sm p-8 text-center">
        <span className="text-5xl">🔗</span>
        <h1 className="mt-3 text-2xl font-black tracking-tight">This link doesn’t work any more</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          It may have expired or been cancelled. Ask whoever sent it for a new one, or find a room in Discover.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild className="rounded-full font-extrabold">
            <Link href="/discover">Browse rooms</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full font-bold">
            <Link href="/">Back to Connecta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
