'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Gift, MessageCircle, MoreHorizontal, UserPlus, X } from 'lucide-react';
import { GiftPlusDialog } from '@/components/app/GiftPlusDialog';
import { joinCommonHref } from '@/features/common/useCommon';
import { toast } from 'sonner';
import { PersonFace } from '@/components/PersonFace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useMe } from '@/features/account/useMe';
import { friendLink, friendsApi, useFriendAction, useFriendRequests, useFriends, type Friend } from '@/features/friends/useFriends';
import { dmCards } from '@/features/dms/useDms';
import { lastSeen } from '@/features/presence/usePresence';
import { problem, useMyRooms } from '@/features/rooms/useRooms';
import { cn } from '@/lib/utils';

/**
 * Friends (feature 5), sorted by "who can I go hang out with":
 * - **Out in rooms**: friends inside a room right now, one card per room with Join. A private room
 *   you're not in is never named: "A private room", one card per friend, "Ask to join"
 * - **Online** (not in a room), then **Offline** ("Last seen")
 * Add friend (exact @handle or your friend link) and Requests (incoming / sent) are dialogs.
 * Declining, ignoring and removing are silent.
 */
export default function FriendsPage() {
  const friends = useFriends();
  const requests = useFriendRequests();
  const [adding, setAdding] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const waiting = requests.data?.incoming.length ?? 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-3xl font-black tracking-[-0.03em]">Friends</h1>
        <Button variant="outline" className="rounded-full font-bold" onClick={() => setShowRequests(true)}>
          Requests
          {waiting > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">{waiting}</span>}
        </Button>
        <Button className="rounded-full font-extrabold" onClick={() => setAdding(true)}>
          <UserPlus /> Add friend
        </Button>
      </div>

      {waiting > 0 && (
        <button
          type="button"
          onClick={() => setShowRequests(true)}
          className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-secondary to-lavender p-4 text-left"
        >
          <div className="flex -space-x-2">
            {requests.data!.incoming.slice(0, 3).map((r) => (
              <PersonFace key={r.person.id} who={r.person} size={36} />
            ))}
          </div>
          <span className="min-w-0 flex-1">
            <span className="block font-black">
              {waiting === 1 ? `${requests.data!.incoming[0]!.person.name} wants to be friends` : `${waiting} people want to be friends`}
            </span>
            <span className="block text-sm text-muted-foreground">Have a look when you’re ready. Nobody is told if you ignore one.</span>
          </span>
        </button>
      )}

      {friends.data?.length === 0 ? <EmptyFriends onAdd={() => setAdding(true)} /> : friends.data && <Sections friends={friends.data} />}

      <AddFriendDialog open={adding} onOpenChange={setAdding} />
      <RequestsDialog open={showRequests} onOpenChange={setShowRequests} />
    </div>
  );
}

/** Live order of how friends are doing: online first, then away. */
const STATUS_ORDER = { online: 0, idle: 1, offline: 2 } as const;

function Sections({ friends }: { friends: Friend[] }) {
  const ask = useFriendAction(dmCards.ask, (_, handle) => {
    const name = friends.find((f) => f.person.handle === handle)?.person.name ?? 'them';
    toast.success(`Asked ${name}. If they say yes, the invite lands in your Messages.`);
  });

  // One card per room you could walk into; one card per friend otherwise, so nobody learns who's together
  const cards = new Map<string, { key: string; title: string; sub: string; friends: Friend[]; href?: string; join: string }>();
  for (const f of friends) {
    const room = f.presence.room;
    if (!room) continue;
    const together = room.member || room.open;
    const key = together ? room.id! : `ask:${f.person.id}`;
    const card = cards.get(key) ?? {
      key,
      title: room.hidden ? '🔒 A private room' : `${room.emoji} ${room.name}`,
      sub: room.hidden
        ? 'You’re not a member, so it stays private'
        : room.member
          ? 'One of your rooms'
          : room.common
            ? 'Common room · anyone can walk in'
            : room.open
              ? 'Open room · anyone can join'
              : 'Members only · ask for an invite',
      friends: [],
      href: room.common
        ? joinCommonHref(room.common, f.person.id)
        : room.member
          ? `/r/${room.id}/walk`
          : room.open
            ? `/r/${room.id}`
            : undefined,
      join: room.member || room.common ? 'Walk in' : 'Join',
    };
    card.friends.push(f);
    cards.set(key, card);
  }
  const out = friends.filter((f) => f.presence.room);
  const byStatus = (a: Friend, b: Friend) => STATUS_ORDER[a.presence.status] - STATUS_ORDER[b.presence.status];
  const online = friends.filter((f) => !f.presence.room && f.presence.status !== 'offline').sort(byStatus);
  const offline = friends.filter((f) => f.presence.status === 'offline');

  return (
    <>
      <Section title="Out in rooms" count={out.length}>
        {cards.size === 0 && (
          <p className="text-sm text-muted-foreground">Nobody’s out right now. Walk in somewhere and they’ll see you 🌙</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {[...cards.values()].map((c) => (
            <div key={c.key} className="flex flex-col gap-2 rounded-3xl border bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.sub}</p>
                </div>
                {c.href ? (
                  <Button asChild size="sm" className="rounded-full font-extrabold">
                    <Link href={c.href}>{c.join}</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full font-extrabold"
                    disabled={ask.isPending}
                    onClick={() => ask.mutate(c.friends[0]!.person.handle!)}
                  >
                    Ask to join {c.friends[0]!.person.name}
                  </Button>
                )}
              </div>
              {c.friends.map(({ person, presence }) => (
                <div key={person.id} className="flex items-center gap-2">
                  <PersonFace who={person} size={30} status={presence.status} />
                  <span className="text-sm font-bold">{person.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {presence.activity ?? (presence.status === 'idle' ? 'Away' : '')}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>
      {online.length > 0 && (
        <Section title="Online" count={online.length}>
          <People friends={online} />
        </Section>
      )}
      {offline.length > 0 && (
        <Section title="Offline" count={offline.length}>
          <People friends={offline} />
        </Section>
      )}
    </>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-black tracking-wider text-muted-foreground uppercase">
        {title} · {count}
      </h2>
      {children}
    </section>
  );
}

function People({ friends }: { friends: Friend[] }) {
  return (
    <div className="flex flex-col divide-y rounded-3xl border bg-card">
      {friends.map((f) => (
        <FriendRow key={f.person.id} friend={f} />
      ))}
    </div>
  );
}

function EmptyFriends({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl bg-gradient-to-br from-peach via-secondary to-lavender p-6 sm:p-8">
      <span className="text-5xl">🫶</span>
      <div>
        <p className="text-xl font-black tracking-tight">Bring your people</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Friends can message you and see which room you’re in. Add them by their exact @handle, or send your friend link.
        </p>
      </div>
      <Button className="rounded-full font-extrabold" onClick={onAdd}>
        <UserPlus /> Add a friend
      </Button>
    </div>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const { person, presence } = friend;
  const remove = useFriendAction(friendsApi.remove, () => toast(`Removed ${person.name}. They won’t be told.`));
  const block = useFriendAction(friendsApi.block, () => toast(`${person.name} is blocked`));
  const invite = useFriendAction(dmCards.invite, (m) =>
    toast.success(`Invite to ${m.card?.room?.name ?? 'your room'} sent to ${person.name}`),
  );
  const rooms = useMyRooms();
  const [gifting, setGifting] = useState(false);
  // Rooms you can bring someone into: a member invite, or else a guest pass (feature 5)
  const invitable = (rooms.data ?? []).filter((r) => r.me.role !== 'member' || r.membersCanInvite || r.allowGuests);
  const status =
    presence.status === 'offline'
      ? `Last seen ${lastSeen(presence.lastSeenAt)}`
      : (presence.activity ?? (presence.status === 'idle' ? 'Away' : 'Online'));
  return (
    <div className="flex items-center gap-3 p-3">
      <GiftPlusDialog to={person} open={gifting} onOpenChange={setGifting} />
      <PersonFace who={person} size={40} status={presence.status} />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">
          {person.name} <span className="text-sm font-semibold text-muted-foreground">@{person.handle}</span>
        </p>
        <p className="truncate text-sm text-muted-foreground">{status}</p>
      </div>
      <Button asChild size="icon" variant="ghost" className="rounded-full" aria-label={`Message ${person.name}`}>
        <Link href={`/home/messages/${person.handle}`}>
          <MessageCircle />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="rounded-full" aria-label={`More for ${person.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!invitable.length}>Invite to a room</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              {invitable.map((r) => (
                <DropdownMenuItem key={r.id} onSelect={() => invite.mutate({ handle: person.handle!, roomId: r.id })}>
                  {r.emoji} {r.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => setGifting(true)}>
            <Gift /> Gift Plus
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => remove.mutate(person.id)}>Remove friend</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => block.mutate(person.id)}>
            Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Exact @handle only (no name search, so nobody can browse people), or share your friend link. */
function AddFriendDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: me } = useMe();
  const requests = useFriendRequests();
  const [handle, setHandle] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const link = me?.handle ? friendLink(me.handle) : '';
  const add = useFriendAction(
    friendsApi.add,
    (r) => {
      setHandle('');
      setResult({
        ok: true,
        text:
          r.status === 'friends' ? `You and ${r.person.name} are friends now 💖` : `Request sent to ${r.person.name} (@${r.person.handle})`,
      });
    },
    true,
  );
  const left = requests.data?.leftToday;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        setResult(null);
      }}
    >
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Add a friend</DialogTitle>
          <DialogDescription>Type their @handle exactly. Nobody can search for people by name.</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!handle.trim()) return;
            // The answer (no such handle, already friends…) shows under the box instead of a toast
            add.mutate(handle.trim(), { onError: (error) => setResult({ ok: false, text: problem(error) }) });
          }}
        >
          <Input
            autoFocus
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setResult(null);
            }}
            placeholder="@handle"
            autoCapitalize="none"
            aria-label="Their @handle"
            className="h-11 rounded-2xl"
          />
          <Button type="submit" disabled={add.isPending} className="h-11 rounded-2xl px-5 font-extrabold">
            Send
          </Button>
        </form>
        {result && (
          <p className={cn('-mt-1 text-sm font-semibold', result.ok ? 'text-mint-ink' : 'text-destructive')}>
            {result.ok && <Check className="mr-1 inline size-4" />}
            {result.text}
          </p>
        )}
        {left !== undefined && left < 5 && <p className="-mt-2 text-xs text-muted-foreground">{left} requests left today.</p>}
        {link && (
          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="text-sm font-extrabold">Your friend link</p>
            <p className="text-xs text-muted-foreground">Post it anywhere. Opening it sends you a friend request.</p>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={link} className="h-10 rounded-xl bg-card font-mono text-sm" aria-label="Your friend link" />
              <Button
                variant="secondary"
                className="h-10 rounded-xl font-bold"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.protocol}//${link}`).catch(() => {});
                  toast.success('Link copied');
                }}
              >
                <Copy /> Copy
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** "today", "yesterday", "3 days ago". Outside the components: render can't read the clock. */
function ago(iso: string) {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

function RequestsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const requests = useFriendRequests();
  const [tab, setTab] = useState<'in' | 'sent'>('in');
  const accept = useFriendAction(friendsApi.accept);
  const ignore = useFriendAction(friendsApi.ignore);
  const cancel = useFriendAction(friendsApi.cancel);
  const incoming = requests.data?.incoming ?? [];
  const sent = requests.data?.sent ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Friend requests</DialogTitle>
          <DialogDescription>Ignoring is silent: they just see “Pending”. Requests expire after 30 days.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
          {(
            [
              ['in', `Incoming · ${incoming.length}`],
              ['sent', `Sent · ${sent.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn('rounded-xl py-1.5 text-sm font-bold', tab === id ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-h-24 flex-col gap-2">
          {tab === 'in' &&
            (incoming.length ? (
              incoming.map(({ person, shared }) => (
                <div key={person.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
                  <PersonFace who={person} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {person.name} <span className="text-xs font-semibold text-muted-foreground">@{person.handle}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {shared.length ? `You’re both in ${shared.slice(0, 2).join(' and ')}` : 'You don’t share a room yet'}
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    className="rounded-full"
                    aria-label={`Accept ${person.name}`}
                    onClick={() =>
                      accept.mutate(person.id, { onSuccess: () => toast.success(`You and ${person.name} are friends now 💖`) })
                    }
                  >
                    <Check />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="rounded-full"
                    aria-label={`Ignore ${person.name}`}
                    onClick={() => ignore.mutate(person.id)}
                  >
                    <X />
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No requests right now 🌱</p>
            ))}
          {tab === 'sent' &&
            (sent.length ? (
              sent.map(({ person, at }) => (
                <div key={person.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
                  <PersonFace who={person} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {person.name} <span className="text-xs font-semibold text-muted-foreground">@{person.handle}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Pending · sent {ago(at)}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-full font-bold" onClick={() => cancel.mutate(person.id)}>
                    Cancel
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting on others.</p>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
