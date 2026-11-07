'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, MessageCircle, MoreHorizontal, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { PRESENCE_LABEL, UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FRIEND_REQUESTS, USERS, serverById, userById, type User } from '@/lib/mock';

const FRIENDS = Object.values(USERS).filter((u) => u.id !== 'bow');

/** Friends: who’s online and where, requests, and adding someone by username. */
export default function FriendsPage() {
  const online = FRIENDS.filter((f) => f.presence !== 'offline');
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-5 sm:p-8">
      <h1 className="text-3xl font-black tracking-[-0.03em]">Friends</h1>
      <Tabs defaultValue="online">
        <TabsList className="h-10 rounded-2xl">
          <TabsTrigger value="online" className="rounded-xl px-4 font-bold">
            Online · {online.length}
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-xl px-4 font-bold">
            All · {FRIENDS.length}
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl px-4 font-bold">
            Requests{' '}
            <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{FRIEND_REQUESTS.length}</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="rounded-xl px-4 font-bold">
            <UserPlus /> Add
          </TabsTrigger>
        </TabsList>
        <TabsContent value="online" className="mt-4">
          <FriendList people={online} />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <FriendList people={FRIENDS} />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <Requests />
        </TabsContent>
        <TabsContent value="add" className="mt-4">
          <AddFriend />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FriendList({ people }: { people: User[] }) {
  return (
    <div className="flex flex-col divide-y rounded-3xl border">
      {people.map((u) => {
        const where = u.inRoom && serverById(u.inRoom.serverId);
        const room = where?.rooms.find((r) => r.id === u.inRoom?.roomId);
        return (
          <div key={u.id} className="flex items-center gap-3 p-3 first:rounded-t-3xl last:rounded-b-3xl hover:bg-muted/40">
            <UserAvatar user={u} size={44} presence />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">
                {u.name} <span className="text-sm font-semibold text-muted-foreground">@{u.handle}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {u.activity ?? PRESENCE_LABEL[u.presence]}
                {where && room && ` · ${room.name} in ${where.name}`}
              </p>
            </div>
            {where && room && (
              <Button asChild className="rounded-full font-extrabold">
                <Link href={`/servers/${where.id}/rooms/${room.id}`}>Join</Link>
              </Button>
            )}
            <Button asChild size="icon" variant="secondary" className="rounded-full" aria-label={`Message ${u.name}`}>
              <Link href={`/home/messages/${u.id}`}>
                <MessageCircle />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full" aria-label="More">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View profile</DropdownMenuItem>
                <DropdownMenuItem>Invite to a server</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Remove friend</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Block</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}

function Requests() {
  const [left, setLeft] = useState(FRIEND_REQUESTS);
  if (!left.length)
    return <p className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">No friend requests right now 🌱</p>;
  return (
    <div className="flex flex-col gap-2">
      {left.map((r) => {
        const u = userById(r.id);
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-3xl border p-3">
            <UserAvatar user={u} size={44} />
            <div className="flex-1">
              <p className="font-extrabold">{u.name}</p>
              <p className="text-sm text-muted-foreground">Wants to be friends · you’re both in Chanom Friends</p>
            </div>
            <Button
              size="icon"
              className="rounded-full"
              aria-label="Accept"
              onClick={() => {
                setLeft([]);
                toast.success(`You and ${u.name} are friends now 💖`);
              }}
            >
              <Check />
            </Button>
            <Button size="icon" variant="outline" className="rounded-full" aria-label="Decline" onClick={() => setLeft([])}>
              <X />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function AddFriend() {
  const [name, setName] = useState('');
  return (
    <form
      className="flex flex-col gap-3 rounded-3xl border p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (name) toast.success(`Friend request sent to @${name.replace('@', '')}`);
        setName('');
      }}
    >
      <p className="font-extrabold">Add a friend by username</p>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="@username" className="h-11 rounded-2xl" />
        <Button type="submit" className="h-11 rounded-2xl px-5 font-extrabold">
          Send request
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Or share your link: connecta.app/u/feifei</p>
    </form>
  );
}
