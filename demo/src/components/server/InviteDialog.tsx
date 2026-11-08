'use client';

import { useState } from 'react';
import { Copy, DoorOpen, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPIRY_OPTIONS, USE_OPTIONS } from '@/features/place/membership';
import { cn } from '@/lib/utils';
import { USERS, type Server } from '@/lib/mock';

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

/**
 * Two kinds of link:
 * - **Member invite**: whoever opens it joins the room (they need an account). Expires after 7 days
 *   by default (or 1 day, or never), optionally after a number of uses.
 * - **Guest pass**: walk into the 3D room without an account, for 24 hours. Only if the room allows guests.
 * Plus "Invite a friend", which sends the invite in a DM. The owner and mods see and cancel active
 * links in Room settings → Invites.
 */
export function InviteDialog({ server, open, onOpenChange }: { server: Server; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [kind, setKind] = useState<'member' | 'guest'>('member');
  const [expiry, setExpiry] = useState<string>('7d');
  const [uses, setUses] = useState<string>('0');
  const [code, setCode] = useState('k3y9');
  const [sent, setSent] = useState<Set<string>>(new Set());
  const guestRooms = server.rooms.filter((r) => r.allowGuests);
  const link = kind === 'member' ? `connecta.app/i/${code}` : `connecta.app/g/${server.id}-g7aa`;
  const friends = Object.values(USERS).filter((u) => !server.members.includes(u.id));

  const copy = () => {
    navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
    toast.success('Link copied');
  };
  // Changing the options makes a new link; the old one keeps its own rules until it runs out
  const remake = (apply: () => void) => {
    apply();
    setCode(newCode());
  };
  const expiryLabel = EXPIRY_OPTIONS.find((o) => o[0] === expiry)![1];
  const usesLabel = USE_OPTIONS.find((o) => o[0] === uses)![1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Invite to {server.name}</DialogTitle>
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

        {kind === 'guest' && (
          <p className="rounded-2xl bg-peach p-3 text-sm text-peach-ink">
            {guestRooms.length
              ? 'Walk in without an account for 24 hours. Guests can listen and type in Bubbles, but can’t talk or see the saved room chat.'
              : 'This room doesn’t allow guests. Turn on “Allow guests” in Room settings → Map & capacity.'}
          </p>
        )}

        {(kind === 'member' || guestRooms.length > 0) && (
          <div className="flex gap-2">
            <Input readOnly value={link} className="h-11 rounded-2xl font-mono text-sm" aria-label="Invite link" />
            <Button onClick={copy} className="h-11 rounded-2xl font-extrabold">
              <Copy /> Copy
            </Button>
          </div>
        )}

        {kind === 'member' && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Expires after</span>
              <Select value={expiry} onValueChange={(v) => remake(() => setExpiry(v))}>
                <SelectTrigger size="sm" className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={uses} onValueChange={(v) => remake(() => setUses(v))}>
                <SelectTrigger size="sm" className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USE_OPTIONS.map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => remake(() => {})}
                className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="New link"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              {expiry === 'never' ? 'Never expires' : `Stops working after ${expiryLabel.toLowerCase()}`}
              {uses === '0' ? '' : ` or ${usesLabel}`}.
            </p>

            <div>
              <p className="mb-2 text-xs font-black tracking-wider text-muted-foreground uppercase">Invite a friend</p>
              {friends.length === 0 && <p className="text-sm text-muted-foreground">All your friends are already here 🎉</p>}
              {friends.map((u) => (
                <div key={u.id} className="flex items-center gap-2 py-1.5">
                  <UserAvatar user={u} size={32} presence />
                  <span className="flex-1 text-sm font-bold">{u.name}</span>
                  <Button
                    size="sm"
                    variant={sent.has(u.id) ? 'ghost' : 'secondary'}
                    disabled={sent.has(u.id)}
                    className="rounded-full font-bold"
                    onClick={() => {
                      setSent((s) => new Set(s).add(u.id));
                      toast.success(`Invite sent to ${u.name} in Messages`);
                    }}
                  >
                    {sent.has(u.id) ? 'Sent' : 'Invite'}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
