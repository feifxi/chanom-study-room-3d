'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DoorOpen, Lock } from 'lucide-react';
import type { AvatarLook } from '@study/shared';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { GUEST_LOOK, saveGuest } from '@/lib/guest';
import { RoomShot, SplitScreen } from '@/components/app/SplitScreen';
import { AvatarStack, UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAPS, SERVERS, userById } from '@/lib/mock';

/**
 * What someone sees when they open an invite: walk in as a guest (no account, if the room allows
 * guests: pick a name and a character, then you're in), or sign in to join the room as a member
 * (its chat, on your Home). A guest who signs up later keeps the character.
 */
export default function InvitePage() {
  const router = useRouter();
  const server = SERVERS[0]!;
  const room = server.rooms.find((r) => r.allowGuests)!;
  const map = MAPS.find((m) => m.id === room.mapId)!;
  const [name, setName] = useState('');
  const [look, setLook] = useState<AvatarLook>(GUEST_LOOK);
  const [picking, setPicking] = useState(false);
  const walkIn = () => {
    const guestName = name.trim() || 'Guest';
    saveGuest({ name: guestName, look });
    router.push(`/servers/${server.id}/rooms/${room.id}?guest=${encodeURIComponent(guestName)}`);
  };
  const others = server.rooms.flatMap((r) => r.people).map(userById);

  return (
    <SplitScreen
      aside={
        <>
          <div>
            <p className="text-sm font-black tracking-wider text-primary uppercase">You’re invited</p>
            <h2 className="mt-2 text-5xl leading-[1.02] font-black tracking-[-0.04em] text-balance">
              {server.emoji} {server.name}
            </h2>
            <p className="mt-3 max-w-md text-lg">{server.description}</p>
          </div>
          <RoomShot
            chips={[
              {
                text: (
                  <>
                    <span className="size-2 rounded-full bg-online" /> {others.length} inside now
                  </>
                ),
                className: '-top-4 -left-4 rotate-[-3deg]',
              },
              ...(server.event ? [{ text: <>📅 {server.event}</>, className: '-right-4 bottom-8 rotate-[3deg]' }] : []),
            ]}
          />
          <div className="flex flex-col gap-2">
            {others.slice(0, 2).map((u) => (
              <p key={u.id} className="flex items-center gap-2.5 text-sm">
                <UserAvatar user={u} size={30} presence />
                <span className="font-black">{u.name}</span>
                <span className="opacity-75">{u.activity ?? 'hanging out'}</span>
              </p>
            ))}
          </div>
        </>
      }
    >
      <div className="overflow-hidden rounded-[2rem] border bg-card shadow-soft">
        <div className={`grid h-32 place-items-center bg-gradient-to-br text-6xl ${server.banner}`}>{map.emoji}</div>
        <div className="flex flex-col gap-5 p-6">
          <div className="text-center">
            <p className="text-sm font-bold text-muted-foreground">feifei invited you to</p>
            <h1 className="text-2xl font-black tracking-[-0.03em]">
              {server.emoji} {server.name}
            </h1>
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <AvatarStack users={others} /> {others.length} inside · {map.emoji} {map.name}
            </div>
          </div>

          {picking ? (
            <form
              className="flex flex-col gap-4 rounded-3xl bg-muted/60 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                walkIn();
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
                    maxLength={16}
                    className="rounded-xl bg-card"
                  />
                </div>
              </CharacterEditor>
              <Button type="submit" className="h-11 rounded-2xl font-extrabold">
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
                No account needed. You can listen and type in Bubbles, but not talk, send photos or share your screen, and you won’t see the
                saved room chat.
              </p>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={16}
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
            <Link href="/login">
              <Lock /> Sign in to join as a member
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">This guest link stops working in 23 hours.</p>
        </div>
      </div>
    </SplitScreen>
  );
}
