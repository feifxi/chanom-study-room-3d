'use client';

import { useState } from 'react';
import {
  Ban,
  Clock,
  Flag,
  LocateFixed,
  MessageCircle,
  MicOff,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  UserMinus,
  UserPlus,
  UserX,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { friendsApi } from '@/features/friends/useFriends';
import { TIMEOUTS } from '@/features/place/membership';
import { problem, roomsApi } from '@/features/rooms/useRooms';
import { setMutedForMe as rememberMutedForMe } from '@/features/voice/mutedForMe';
import { commonApi } from '@/features/common/useCommon';
import { ReportDialog } from '@/features/moderation/ReportDialog';
import { cn } from '@/lib/utils';
import type { RoomPerson, RoomRole } from './RoomPeople';

/**
 * The "…" on a person in the room list. Everyone gets the personal actions (message, add friend,
 * mute them just for you, block, report). Owners and mods get a "Moderate" group in the same menu,
 * so managing people happens where you see them, not in a separate admin screen:
 * - a mod can act on members and guests; the owner on everyone but themselves
 * - mute for everyone, time out (can't talk or type for a while), kick, ban; the owner can also
 *   make someone a mod
 *
 * In a real room (`roomId`) the actions go to the API: friends, blocks and moderation, which the
 * game server applies at once. Mute for everyone goes to the game server (LiveKit stops their mic);
 * Mute for me is remembered in this browser.
 */
export function PersonMenu({
  p,
  myRole,
  roomId,
  place,
  bubbles,
  youGuest,
  onFind,
  onMessage,
  onRemove,
  onMuteForEveryone,
}: {
  p: RoomPerson;
  myRole?: RoomRole;
  /** A real room (build step 4); none in the demo and Common rooms */
  roomId?: string;
  /** Where a report says it happened (the room, or the Common copy) */
  place?: string;
  /** What they said in bubbles lately, sent with a report */
  bubbles?: string[];
  /** You're a guest: no messages, friends or blocks */
  youGuest?: boolean;
  onFind: () => void;
  onMessage: () => void;
  /** Kicked or banned: they drop out of the room. */
  onRemove: () => void;
  /** A real room: Mute for everyone through the game server */
  onMuteForEveryone?: (on: boolean) => void;
}) {
  const [mutedForMe, setMutedForMe] = useState(false);
  const [mutedForAll, setMutedForAll] = useState(false);
  const [role, setRole] = useState(p.role);
  const [requested, setRequested] = useState(false);
  const [confirm, setConfirm] = useState<'kick' | 'ban' | 'block' | null>(null);
  const [report, setReport] = useState(false);
  // A real room's roles come from the game server; the demo's are kept here
  const theirRole = roomId ? p.role : role;
  const canModerate = myRole === 'Team' || (myRole === 'Owner' ? theirRole !== 'Owner' : myRole === 'Mod' ? !theirRole : false);
  const live = roomId && p.userId ? { id: roomId, userId: p.userId } : null;
  /** A real action: the toast on success, the API's reason on failure */
  const act = (call: Promise<unknown>, done: string) =>
    call.then(
      () => toast.success(done),
      (e: unknown) => toast.error(problem(e)),
    );

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex-none rounded-full p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-card hover:text-foreground focus-visible:opacity-100 data-[state=open]:bg-card data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label={`More for ${p.name}`}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="left" className="w-60 rounded-2xl p-1.5">
          <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-1.5">
            <UserAvatar user={{ name: p.name, color: p.color, presence: 'online' }} size={32} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-black">
                <span className="truncate">{p.name}</span>
                {theirRole && <RoleChip role={theirRole} />}
                {p.guest && <span className="rounded-full bg-peach px-1.5 text-[10px] font-black text-peach-ink">guest</span>}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{p.status}</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onFind}>
              <LocateFixed /> Find in the room
            </DropdownMenuItem>
            {/* Guests have no account, so no DMs or friends */}
            {/* DMs are between friends: in a real room, strangers get Add friend instead */}
            {!p.guest && !youGuest && (!live || p.friend) && (
              <DropdownMenuItem onSelect={onMessage}>
                <MessageCircle /> Send a message
              </DropdownMenuItem>
            )}
            {!p.guest && !p.friend && !youGuest && (
              <DropdownMenuItem
                disabled={requested}
                onSelect={() => {
                  setRequested(true);
                  if (live && p.handle) void act(friendsApi.add(p.handle), `Friend request sent to ${p.name}`);
                  else toast.success(`Friend request sent to ${p.name}`);
                }}
              >
                <UserPlus /> {requested ? 'Friend request sent' : 'Add friend'}
              </DropdownMenuItem>
            )}
            {!p.you && (
              <DropdownMenuCheckboxItem
                checked={live ? !!p.mutedForMe : mutedForMe}
                onCheckedChange={(v) => {
                  if (live) rememberMutedForMe(live.userId, v);
                  else setMutedForMe(v);
                  toast(v ? `You won't hear ${p.name}. Only you.` : `You can hear ${p.name} again`);
                }}
              >
                <VolumeX /> Mute for me
              </DropdownMenuCheckboxItem>
            )}
          </DropdownMenuGroup>

          {myRole === 'Team' && theirRole !== 'Team' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                Connecta team · Common room
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Clock /> Time out
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {TIMEOUTS.map(([id, label]) => (
                      <DropdownMenuItem
                        key={id}
                        onSelect={() =>
                          p.userId
                            ? void act(commonApi.timeOut(p.userId, id), `${p.name} can’t type in Common rooms for ${label}`)
                            : toast(`${p.name} can’t type for ${label}`)
                        }
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    const done = `${p.name} is out of Common rooms for 1 hour`;
                    if (!p.userId) return toast(done);
                    void act(commonApi.remove(p.userId), done).then(onRemove);
                  }}
                >
                  <UserMinus /> Remove from Common rooms (1 h)
                </DropdownMenuItem>
                {!p.guest && p.userId && (
                  <DropdownMenuItem onSelect={() => window.open(`/admin/users?user=${encodeURIComponent(p.userId!)}`, '_blank')}>
                    <ShieldCheck /> Open in the admin site
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}

          {canModerate && myRole !== 'Team' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                Moderate · you’re {myRole === 'Owner' ? 'the owner' : 'a mod'}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {(!live || onMuteForEveryone) && (
                  <DropdownMenuCheckboxItem
                    checked={live ? !!p.mutedByMod : mutedForAll}
                    onCheckedChange={(v) => {
                      if (live) onMuteForEveryone?.(v);
                      else setMutedForAll(v);
                      toast(v ? `${p.name}'s mic is off for everyone in this room` : `${p.name} can talk again`);
                    }}
                  >
                    <MicOff /> Mute for everyone
                  </DropdownMenuCheckboxItem>
                )}
                {/* Guests aren't members, so there's nothing to time out: kick or ban them */}
                {!(live && p.guest) && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Clock /> Time out
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {TIMEOUTS.map(([id, label]) => (
                        <DropdownMenuItem
                          key={id}
                          onSelect={() =>
                            live
                              ? void act(roomsApi.timeOut({ ...live, duration: id }), `${p.name} can’t talk or type for ${label}`)
                              : toast(`${p.name} can’t talk or type for ${label}`)
                          }
                        >
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                {myRole === 'Owner' && !p.guest && (
                  <DropdownMenuItem
                    onSelect={() => {
                      const next = theirRole === 'Mod' ? undefined : 'Mod';
                      const done = next ? `${p.name} is now a mod` : `${p.name} is no longer a mod`;
                      if (live) return void act(roomsApi.setRole({ ...live, role: next ? 'mod' : 'member' }), done);
                      setRole(next);
                      toast.success(done);
                    }}
                  >
                    {theirRole === 'Mod' ? <ShieldOff /> : <ShieldCheck />} {theirRole === 'Mod' ? 'Remove mod' : 'Make mod'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm('kick')}>
                  <UserMinus /> Kick from the room
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm('ban')}>
                  <Ban /> Ban from the room
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {!p.guest && !youGuest && (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm('block')}>
                <UserX /> Block
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => setReport(true)}>
              <Flag /> Report
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        p={p}
        kind={confirm}
        onClose={() => setConfirm(null)}
        onDone={(kind, reason) => {
          if (!live) {
            toast.success(CONFIRM[kind].done(p.name));
            if (kind !== 'block') onRemove();
            return;
          }
          // The game server takes them out of the room; the list follows
          const call =
            kind === 'kick'
              ? roomsApi.kick(live)
              : kind === 'ban'
                ? roomsApi.ban({ ...live, reason: reason.trim() || undefined })
                : friendsApi.block(live.userId);
          void act(call, CONFIRM[kind].done(p.name));
        }}
      />
      <ReportDialog
        person={{ id: p.userId || undefined, name: p.name, guest: p.guest }}
        place={place}
        bubbles={bubbles}
        canBlock={!p.guest && !youGuest}
        open={report}
        onOpenChange={setReport}
      />
    </>
  );
}

export function RoleChip({ role }: { role: RoomRole }) {
  return (
    <span
      className={cn(
        'flex-none rounded-full px-1.5 text-[10px] font-black',
        role === 'Owner' ? 'bg-lavender text-lavender-ink' : role === 'Team' ? 'bg-mint text-mint-ink' : 'bg-sky text-sky-ink',
      )}
    >
      {role === 'Owner' ? 'owner' : role === 'Team' ? 'Connecta team' : 'mod'}
    </span>
  );
}

const CONFIRM = {
  kick: {
    title: (n: string) => `Kick ${n} from the room?`,
    body: 'They leave right away. They can come back with an invite.',
    action: 'Kick',
    done: (n: string) => `${n} was kicked from the room`,
  },
  ban: {
    title: (n: string) => `Ban ${n} from the room?`,
    body: 'They leave right away and can’t come back, even with an invite. Unban them in Settings → Members.',
    action: 'Ban',
    done: (n: string) => `${n} is banned from the room`,
  },
  block: {
    title: (n: string) => `Block ${n}?`,
    body: 'You won’t hear them or see their messages, and they can’t message you or send you a friend request. They aren’t told.',
    action: 'Block',
    done: (n: string) => `${n} is blocked`,
  },
};

function ConfirmDialog({
  p,
  kind,
  onClose,
  onDone,
}: {
  p: RoomPerson;
  kind: keyof typeof CONFIRM | null;
  onClose: () => void;
  onDone: (kind: keyof typeof CONFIRM, reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const c = kind && CONFIRM[kind];
  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      {c && kind && (
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black">{c.title(p.name)}</DialogTitle>
            <DialogDescription>{c.body}</DialogDescription>
          </DialogHeader>
          {kind !== 'block' && (
            <div className="grid gap-1.5">
              <Label htmlFor="mod-reason" className="text-xs font-bold">
                Reason <span className="font-normal text-muted-foreground">(optional, shown to them and in the mod log)</span>
              </Label>
              <Textarea id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="rounded-xl" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-full font-extrabold" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full bg-destructive font-extrabold text-white hover:bg-destructive/90"
              onClick={() => {
                onDone(kind, reason);
                setReason('');
                onClose();
              }}
            >
              {c.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
