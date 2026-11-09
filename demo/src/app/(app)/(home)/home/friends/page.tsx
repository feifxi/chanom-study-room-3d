'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, MessageCircle, MoreHorizontal, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
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
import { cn } from '@/lib/utils';
import { FRIEND_REQUESTS, FRIENDS, ME, SENT_REQUESTS, SERVERS, USERS, serverById, userById, type User } from '@/lib/mock';
import { roleIn } from '@/lib/viewer';

/** Requests you can send a day, against spam. */
const DAILY_REQUESTS = 20;

/**
 * Friends, sorted by "who can I go hang out with":
 * - **Out in rooms**: friends inside a room right now, one card per room with Join. A private room
 *   you're not in is never named (like Discord): "A private room", one card per friend, "Ask to join"
 * - **Online** (not in a room), then **Offline**
 * Add friend (exact @handle or your friend link) and Requests (incoming / sent) are dialogs.
 * Declining, ignoring and removing are silent.
 */
export default function FriendsPage() {
  const [friends, setFriends] = useState<User[]>(FRIENDS);
  const [incoming, setIncoming] = useState(FRIEND_REQUESTS);
  const [sent, setSent] = useState(SENT_REQUESTS);
  const [adding, setAdding] = useState(false);
  const [requests, setRequests] = useState(false);

  // One card per room: rooms you can enter by id, rooms you can't by name
  const rooms = new Map<string, { key: string; title: string; sub: string; people: User[]; href?: string }>();
  for (const u of friends) {
    if (u.inRoom) {
      const s = serverById(u.inRoom.serverId);
      const r = s?.rooms.find((x) => x.id === u.inRoom!.roomId);
      if (!s || !r) continue;
      const card = rooms.get(s.id) ?? {
        key: s.id,
        // A Common room copy is its own place: name the copy, not the template group
        title: s.id === 'public' ? `🌏 ${r.name}` : `${s.emoji} ${s.name}`,
        sub: s.id === 'public' ? 'Common room · text only' : r.name,
        people: [],
        href: `/servers/${s.id}/rooms/${r.id}`,
      };
      card.people.push(u);
      rooms.set(s.id, card);
    } else if (u.inPrivateRoom) {
      // One card per friend: grouping would tell you which friends are together in there
      rooms.set(`private:${u.id}`, {
        key: `private:${u.id}`,
        title: '🔒 A private room',
        sub: 'You’re not a member, so it stays private',
        people: [u],
      });
    }
  }
  const out = friends.filter((u) => u.inRoom || u.inPrivateRoom);
  const online = friends.filter((u) => !u.inRoom && !u.inPrivateRoom && u.presence !== 'offline');
  const offline = friends.filter((u) => u.presence === 'offline');
  const remove = (u: User, block: boolean) => {
    setFriends((all) => all.filter((x) => x.id !== u.id));
    toast(block ? `${u.name} is blocked` : `Removed ${u.name}. They won’t be told.`);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-3xl font-black tracking-[-0.03em]">Friends</h1>
        <Button variant="outline" className="rounded-full font-bold" onClick={() => setRequests(true)}>
          Requests
          {incoming.length > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">{incoming.length}</span>
          )}
        </Button>
        <Button className="rounded-full font-extrabold" onClick={() => setAdding(true)}>
          <UserPlus /> Add friend
        </Button>
      </div>

      <Section title="Out in rooms" count={out.length}>
        {rooms.size === 0 && (
          <p className="text-sm text-muted-foreground">Nobody’s out right now. Walk in somewhere and they’ll see you 🌙</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {[...rooms.values()].map((c) => (
            <div key={c.key} className="flex flex-col gap-2 rounded-3xl border bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.sub}</p>
                </div>
                {c.href ? (
                  <Button asChild size="sm" className="rounded-full font-extrabold">
                    <Link href={c.href}>Join</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full font-extrabold"
                    onClick={() => toast.success(`Asked ${c.people[0]!.name}. If they say yes, the invite lands in your Messages.`)}
                  >
                    Ask to join {c.people[0]!.name}
                  </Button>
                )}
              </div>
              {c.people.map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <UserAvatar user={u} size={30} presence />
                  <span className="text-sm font-bold">{u.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{u.activity}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Online" count={online.length}>
        <People people={online} onRemove={remove} />
      </Section>
      <Section title="Offline" count={offline.length}>
        <People people={offline} onRemove={remove} />
      </Section>

      <AddFriendDialog
        open={adding}
        onOpenChange={setAdding}
        friends={friends}
        onSent={(u) => setSent((all) => [...all, { handle: u.handle, name: u.name, color: u.color, at: 'Just now' }])}
      />
      <RequestsDialog
        open={requests}
        onOpenChange={setRequests}
        incoming={incoming.map((r) => userById(r.id))}
        sent={sent}
        onAccept={(u) => {
          setIncoming((l) => l.filter((r) => r.id !== u.id));
          setFriends((f) => [...f, u]);
          toast.success(`You and ${u.name} are friends now 💖`);
        }}
        onIgnore={(u) => setIncoming((l) => l.filter((r) => r.id !== u.id))}
        onCancel={(handle) => setSent((l) => l.filter((r) => r.handle !== handle))}
      />
    </div>
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

function People({ people, onRemove }: { people: User[]; onRemove: (u: User, block: boolean) => void }) {
  if (!people.length) return null;
  const myRooms = SERVERS.filter((s) => roleIn(s) || s.visibility !== 'private');
  return (
    <div className="flex flex-col divide-y rounded-3xl border bg-card">
      {people.map((u) => (
        <div key={u.id} className="flex items-center gap-3 p-3">
          <UserAvatar user={u} size={40} presence />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">
              {u.name} <span className="text-sm font-semibold text-muted-foreground">@{u.handle}</span>
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {u.presence === 'offline' ? `Last seen ${u.lastSeen ?? 'a while ago'}` : (u.activity ?? 'Online')}
            </p>
          </div>
          <Button asChild size="icon" variant="secondary" className="rounded-full" aria-label={`Message ${u.name}`}>
            <Link href={`/home/messages/${u.id}`}>
              <MessageCircle />
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-full" aria-label={`More for ${u.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Invite to a room</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {myRooms.map((s) => (
                    <DropdownMenuItem key={s.id} onSelect={() => toast.success(`Invite to ${s.name} sent to ${u.name}`)}>
                      {s.emoji} {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onRemove(u, false)}>Remove friend</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => onRemove(u, true)}>
                Block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}

/** Exact @handle only (no name search, so nobody can browse people), or share your friend link. */
function AddFriendDialog({
  open,
  onOpenChange,
  friends,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  friends: User[];
  onSent: (u: User) => void;
}) {
  const [handle, setHandle] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [left, setLeft] = useState(DAILY_REQUESTS);
  const link = `connecta.app/f/${ME.handle}`;

  const send = () => {
    const h = handle.trim().replace(/^@/, '').toLowerCase();
    if (!h) return;
    const u = Object.values(USERS).find((x) => x.handle === h);
    if (h === ME.handle) return setResult({ ok: false, text: 'That’s you 😄' });
    if (!u) return setResult({ ok: false, text: `No one is @${h}. Handles have to match exactly.` });
    if (friends.some((f) => f.id === u.id)) return setResult({ ok: false, text: `You and ${u.name} are already friends.` });
    if (left === 0) return setResult({ ok: false, text: `That’s ${DAILY_REQUESTS} requests today. Try again tomorrow.` });
    setLeft(left - 1);
    onSent(u);
    setHandle('');
    setResult({ ok: true, text: `Request sent to ${u.name} (@${u.handle})` });
  };

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
          <DialogDescription>Type their @handle exactly. You can also add people from a room’s people list.</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
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
            className="h-11 rounded-2xl"
          />
          <Button type="submit" className="h-11 rounded-2xl px-5 font-extrabold">
            Send
          </Button>
        </form>
        {result && (
          <p className={cn('-mt-1 text-sm font-semibold', result.ok ? 'text-mint-ink' : 'text-destructive')}>
            {result.ok && <Check className="mr-1 inline size-4" />}
            {result.text}
          </p>
        )}
        <div className="rounded-2xl bg-muted/60 p-3">
          <p className="text-sm font-extrabold">Your friend link</p>
          <p className="text-xs text-muted-foreground">Post it anywhere. Opening it sends you a friend request.</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={link} className="h-10 rounded-xl bg-card font-mono text-sm" aria-label="Your friend link" />
            <Button
              variant="secondary"
              className="h-10 rounded-xl font-bold"
              onClick={() => {
                navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
                toast.success('Link copied');
              }}
            >
              <Copy /> Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequestsDialog({
  open,
  onOpenChange,
  incoming,
  sent,
  onAccept,
  onIgnore,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  incoming: User[];
  sent: { handle: string; name: string; color: string; at: string }[];
  onAccept: (u: User) => void;
  onIgnore: (u: User) => void;
  onCancel: (handle: string) => void;
}) {
  const [tab, setTab] = useState<'in' | 'sent'>('in');
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
              incoming.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
                  <UserAvatar user={u} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {u.name} <span className="text-xs font-semibold text-muted-foreground">@{u.handle}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">You’re both in Chanom Friends</p>
                  </div>
                  <Button size="icon-sm" className="rounded-full" aria-label={`Accept ${u.name}`} onClick={() => onAccept(u)}>
                    <Check />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="rounded-full"
                    aria-label={`Ignore ${u.name}`}
                    onClick={() => onIgnore(u)}
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
              sent.map((r) => (
                <div key={r.handle} className="flex items-center gap-3 rounded-2xl border p-2.5">
                  <UserAvatar user={{ name: r.name, color: r.color, presence: 'offline' }} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {r.name} <span className="text-xs font-semibold text-muted-foreground">@{r.handle}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Pending · sent {r.at}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-full font-bold" onClick={() => onCancel(r.handle)}>
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
