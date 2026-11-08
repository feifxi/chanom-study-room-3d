'use client';

import { useState } from 'react';
import { Copy, DoorOpen, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { USERS, type Server } from '@/lib/mock';

/**
 * Two kinds of link: a member invite (they need an account, then the room is on their Home with its
 * chat), and a guest link (no account, a visit to the 3D room only, expires).
 */
export function InviteDialog({ server, open, onOpenChange }: { server: Server; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [kind, setKind] = useState<'member' | 'guest'>('member');
  const guestRooms = server.rooms.filter((r) => r.allowGuests);
  const link = kind === 'member' ? `connecta.app/i/${server.id}-k3y9` : `connecta.app/g/${guestRooms[0]?.id ?? 'room'}-${server.id}`;
  const copy = () => {
    navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
    toast.success('Link copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Invite to {server.name}</DialogTitle>
          <DialogDescription>Share a link. Members need an account; guests just visit, no account.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          {(
            [
              ['member', UserPlus, 'New member'],
              ['guest', DoorOpen, 'Guest visit'],
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
              ? 'Guests can walk in without an account. They can’t see the saved room chat or your members. The link stops working in 24 hours.'
              : 'This room doesn’t allow guests. Turn on “Allow guests” in Room settings → Map & capacity.'}
          </p>
        )}
        <div className="flex gap-2">
          <Input readOnly value={link} className="h-11 rounded-2xl font-mono text-sm" />
          <Button onClick={copy} className="h-11 rounded-2xl font-extrabold">
            <Copy /> Copy
          </Button>
        </div>
        {kind === 'member' && (
          <div>
            <p className="mb-2 text-xs font-black tracking-wider text-muted-foreground uppercase">Or send to a friend</p>
            {Object.values(USERS)
              .filter((u) => !server.members.includes(u.id))
              .concat(Object.values(USERS).slice(0, 2))
              .slice(0, 3)
              .map((u) => (
                <div key={u.id} className="flex items-center gap-2 py-1.5">
                  <UserAvatar user={u} size={32} presence />
                  <span className="flex-1 text-sm font-bold">{u.name}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full font-bold"
                    onClick={() => toast.success(`Invite sent to ${u.name}`)}
                  >
                    Invite
                  </Button>
                </div>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
