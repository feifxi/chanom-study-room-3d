'use client';

import { useState } from 'react';
import { Check, Copy, MoreHorizontal, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { PersonFace } from '@/components/PersonFace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useMe } from '@/features/account/useMe';
import { friendLink, friendsApi, useFriendAction, useFriendRequests, useFriends, type Friend } from '@/features/friends/useFriends';
import { problem } from '@/features/rooms/useRooms';
import { cn } from '@/lib/utils';

/**
 * Friends (feature 5). Add friend (exact @handle or your friend link) and Requests (incoming / sent)
 * are dialogs; declining, ignoring and removing are silent. "Out in rooms", Online and Offline, and
 * the message and invite buttons come with presence and DMs (later in step 3), so for now it's one list.
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

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black tracking-wider text-muted-foreground uppercase">Your friends · {friends.data?.length ?? '…'}</h2>
        {friends.data?.length === 0 ? (
          <EmptyFriends onAdd={() => setAdding(true)} />
        ) : (
          <div className="flex flex-col divide-y rounded-3xl border bg-card">
            {friends.data?.map((f) => (
              <FriendRow key={f.person.id} friend={f} />
            ))}
          </div>
        )}
      </section>

      <AddFriendDialog open={adding} onOpenChange={setAdding} />
      <RequestsDialog open={showRequests} onOpenChange={setShowRequests} />
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
  const { person } = friend;
  const remove = useFriendAction(friendsApi.remove, () => toast(`Removed ${person.name}. They won’t be told.`));
  const block = useFriendAction(friendsApi.block, () => toast(`${person.name} is blocked`));
  const since = new Date(friend.since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return (
    <div className="flex items-center gap-3 p-3">
      <PersonFace who={person} size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">
          {person.name} <span className="text-sm font-semibold text-muted-foreground">@{person.handle}</span>
        </p>
        <p className="truncate text-sm text-muted-foreground">Friends since {since}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="rounded-full" aria-label={`More for ${person.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
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
