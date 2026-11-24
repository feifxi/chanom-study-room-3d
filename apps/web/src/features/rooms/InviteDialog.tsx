'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, DoorOpen, RefreshCw, UserPlus } from 'lucide-react';
import { INVITE_EXPIRIES, type InviteExpiry } from '@connecta/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlaceRoom } from '@/features/place/model';
import { inviteUrl, problem, ROOMS_KEY, roomsApi } from '@/features/rooms/useRooms';
import { cn } from '@/lib/utils';

const EXPIRY_LABEL: Record<InviteExpiry, string> = { '1d': '1 day', '7d': '7 days', never: 'Never' };

/**
 * Two kinds of link:
 * - **Member invite**: whoever opens it joins the room (they need an account). Expires after 7 days
 *   by default (or 1 day, or never). No use limits: to invite one person, invite them as a friend.
 * - **Guest pass**: walk into the 3D room without an account, for 24 hours. Only if the room allows guests.
 * The owner and mods see and cancel active links in Room settings → Invites.
 */
export function InviteDialog({ room, open, onOpenChange }: { room: PlaceRoom; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <Body room={room} />}
    </Dialog>
  );
}

function Body({ room }: { room: PlaceRoom }) {
  const client = useQueryClient();
  const [kind, setKind] = useState<'member' | 'guest'>('member');
  const [expiry, setExpiry] = useState<InviteExpiry>('7d');
  const [busy, setBusy] = useState(false);
  const r = room.room;
  const mayInvite = room.canEdit || r.membersCanInvite;
  const possible = mayInvite && (kind === 'member' || r.allowGuests);
  // Your link for this room: the API hands back the same one while it has plenty of time left
  const key = [...ROOMS_KEY, room.id, 'my-invite', kind, kind === 'guest' ? '24h' : expiry];
  const link = useQuery({
    queryKey: key,
    queryFn: () => roomsApi.makeInvite({ id: room.id, kind, expiry, fresh: false }),
    enabled: possible,
    staleTime: Infinity,
  });
  const url = link.data ? inviteUrl(link.data) : '';

  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success('Link copied');
  };
  const fresh = async () => {
    setBusy(true);
    try {
      client.setQueryData(key, await roomsApi.makeInvite({ id: room.id, kind, expiry, fresh: true }));
      void client.invalidateQueries({ queryKey: [...ROOMS_KEY, room.id, 'invites'] });
    } catch (error) {
      toast.error(problem(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl font-black">Invite to {room.name}</DialogTitle>
        <DialogDescription>Members join the room. Guests just visit, no account.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
        {(
          [
            ['member', UserPlus, 'Member invite'],
            ['guest', DoorOpen, 'Guest pass'],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setKind(id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold',
              kind === id ? 'bg-card shadow-sm' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {!mayInvite ? (
        <p className="rounded-2xl bg-muted p-3 text-sm">
          Only the owner and mods make invite links in this room. Ask one of them for a link.
        </p>
      ) : (
        kind === 'guest' && (
          <p className="rounded-2xl bg-peach p-3 text-sm text-peach-ink">
            {r.allowGuests
              ? 'Walk in without an account for 24 hours. Guests can listen and type in Bubbles, but can’t talk or see the saved room chat.'
              : 'This room doesn’t allow guests. The owner or a mod can turn on “Allow guests” in Room settings → Invites.'}
          </p>
        )
      )}

      {possible && (
        <div className="flex gap-2">
          <Input
            readOnly
            value={link.isError ? 'Couldn’t make a link' : url.replace(/^https?:\/\//, '') || 'Making your link…'}
            className="h-11 rounded-2xl font-mono text-sm"
            aria-label="Invite link"
          />
          <Button onClick={copy} disabled={!url} className="h-11 rounded-2xl font-extrabold">
            <Copy /> Copy
          </Button>
        </div>
      )}

      {possible && kind === 'member' && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Expires after</span>
            <Select value={expiry} onValueChange={(v) => setExpiry(v as InviteExpiry)}>
              <SelectTrigger size="sm" className="rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITE_EXPIRIES.map((id) => (
                  <SelectItem key={id} value={id}>
                    {EXPIRY_LABEL[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={fresh}
              disabled={busy}
              className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="New link"
            >
              <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
            </button>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {link.data?.expiresAt
              ? `Stops working on ${new Date(link.data.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`
              : 'Never expires.'}{' '}
            Anyone with the link can join; cancel it in Room settings → Invites.
          </p>
        </>
      )}
      {possible && kind === 'guest' && link.data?.expiresAt && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Works until {new Date(link.data.expiresAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.
        </p>
      )}
    </DialogContent>
  );
}
