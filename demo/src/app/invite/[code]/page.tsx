'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DoorOpen, Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { AvatarStack } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAPS, SERVERS, userById } from '@/lib/mock';

/**
 * What someone sees when they open a guest link: walk straight into the one room as a guest
 * (no account), or sign in to become a member of the whole server.
 */
export default function InvitePage() {
  const router = useRouter();
  const server = SERVERS[0]!;
  const room = server.rooms.find((r) => r.allowGuests)!;
  const map = MAPS.find((m) => m.id === room.mapId)!;
  const [name, setName] = useState('');
  const others = server.rooms.flatMap((r) => r.people).map(userById);

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo />
        </Link>
        <div className="overflow-hidden rounded-[2rem] border bg-card shadow-soft">
          <div className={`grid h-32 place-items-center bg-gradient-to-br text-6xl ${server.banner}`}>{map.emoji}</div>
          <div className="flex flex-col gap-5 p-6">
            <div className="text-center">
              <p className="text-sm font-bold text-muted-foreground">feifei invited you to</p>
              <h1 className="text-2xl font-black tracking-[-0.03em]">
                the {room.name} in {server.emoji} {server.name}
              </h1>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <AvatarStack users={others} /> {others.length} people around
              </div>
            </div>

            <form
              className="flex flex-col gap-2 rounded-3xl bg-muted/60 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/servers/${server.id}/rooms/${room.id}?guest=${encodeURIComponent(name || 'Guest')}`);
              }}
            >
              <p className="flex items-center gap-1.5 font-extrabold">
                <DoorOpen className="size-4 text-primary" /> Walk in as a guest
              </p>
              <p className="text-xs text-muted-foreground">
                No account needed. You’ll only see this room, and you can chat but not talk on voice.
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
                  Walk in
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button asChild variant="outline" className="h-11 rounded-2xl font-bold">
              <Link href="/login">
                <Lock /> Sign in to join the whole server
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">This guest link stops working in 23 hours.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
