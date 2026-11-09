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
import { Checkbox } from '@/components/ui/checkbox';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { TIMEOUTS } from '@/features/place/membership';
import { cn } from '@/lib/utils';
import type { RoomPerson, RoomRole } from './RoomPeople';

/**
 * The "…" on a person in the room list. Everyone gets the personal actions (message, add friend,
 * mute them just for you, block, report). Owners and mods get a "Moderate" group in the same menu,
 * so managing people happens where you see them, not in a separate admin screen:
 * - a mod can act on members and guests; the owner on everyone but themselves
 * - mute for everyone, time out (can't talk or type for a while), kick, ban; the owner can also
 *   make someone a mod
 */
export function PersonMenu({
  p,
  myRole,
  onFind,
  onMessage,
  onRemove,
}: {
  p: RoomPerson;
  myRole?: RoomRole;
  onFind: () => void;
  onMessage: () => void;
  /** Kicked or banned: they drop out of the room. */
  onRemove: () => void;
}) {
  const [mutedForMe, setMutedForMe] = useState(false);
  const [mutedForAll, setMutedForAll] = useState(false);
  const [role, setRole] = useState(p.role);
  const [requested, setRequested] = useState(false);
  const [confirm, setConfirm] = useState<'kick' | 'ban' | 'block' | null>(null);
  const [report, setReport] = useState(false);
  const canModerate = myRole === 'Team' || (myRole === 'Owner' ? role !== 'Owner' : myRole === 'Mod' ? !role : false);

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
                {role && <RoleChip role={role} />}
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
            {!p.guest && (
              <DropdownMenuItem onSelect={onMessage}>
                <MessageCircle /> Send a message
              </DropdownMenuItem>
            )}
            {!p.guest && !p.friend && (
              <DropdownMenuItem
                disabled={requested}
                onSelect={() => {
                  setRequested(true);
                  toast.success(`Friend request sent to ${p.name}`);
                }}
              >
                <UserPlus /> {requested ? 'Friend request sent' : 'Add friend'}
              </DropdownMenuItem>
            )}
            <DropdownMenuCheckboxItem
              checked={mutedForMe}
              onCheckedChange={(v) => {
                setMutedForMe(v);
                toast(v ? `You won't hear ${p.name}. Only you.` : `You can hear ${p.name} again`);
              }}
            >
              <VolumeX /> Mute for me
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>

          {myRole === 'Team' && (
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
                      <DropdownMenuItem key={id} onSelect={() => toast(`${p.name} can’t type for ${label}`)}>
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    onRemove();
                    toast(`${p.name} is out of Common rooms for 1 hour. It’s in the audit log.`);
                  }}
                >
                  <UserMinus /> Remove from Common rooms (1 h)
                </DropdownMenuItem>
                {!p.guest && (
                  <DropdownMenuItem onSelect={() => window.open('/admin/users', '_blank')}>
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
                <DropdownMenuCheckboxItem
                  checked={mutedForAll}
                  onCheckedChange={(v) => {
                    setMutedForAll(v);
                    toast(v ? `${p.name}'s mic is off for everyone in this room` : `${p.name} can talk again`);
                  }}
                >
                  <MicOff /> Mute for everyone
                </DropdownMenuCheckboxItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Clock /> Time out
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {TIMEOUTS.map(([id, label]) => (
                      <DropdownMenuItem key={id} onSelect={() => toast(`${p.name} can’t talk or type for ${label}`)}>
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {myRole === 'Owner' && !p.guest && (
                  <DropdownMenuItem
                    onSelect={() => {
                      const next = role === 'Mod' ? undefined : 'Mod';
                      setRole(next);
                      toast.success(next ? `${p.name} is now a mod` : `${p.name} is no longer a mod`);
                    }}
                  >
                    {role === 'Mod' ? <ShieldOff /> : <ShieldCheck />} {role === 'Mod' ? 'Remove mod' : 'Make mod'}
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
            {!p.guest && (
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
        onDone={(kind) => {
          if (kind !== 'block') onRemove();
        }}
      />
      <ReportDialog p={p} open={report} onOpenChange={setReport} />
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
  onDone: (kind: keyof typeof CONFIRM) => void;
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
                toast.success(c.done(p.name));
                onDone(kind);
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

const REASONS = [
  ['harass', 'Harassment or bullying'],
  ['hate', 'Hate or discrimination'],
  ['sexual', 'Sexual content'],
  ['spam', 'Spam or scams'],
  ['name', 'Offensive name or avatar'],
  ['other', 'Something else'],
] as const;

function ReportDialog({ p, open, onOpenChange }: { p: RoomPerson; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [reason, setReason] = useState<string>('');
  const [block, setBlock] = useState(!p.guest);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Report {p.name}</DialogTitle>
          <DialogDescription>
            Reports go to the Connecta team, and to this room’s mods. {p.name} won’t know who reported them.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="gap-1">
          {REASONS.map(([id, label]) => (
            <Label
              key={id}
              htmlFor={`report-${id}`}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-bold',
                reason === id && 'border-primary bg-secondary',
              )}
            >
              <RadioGroupItem id={`report-${id}`} value={id} />
              {label}
            </Label>
          ))}
        </RadioGroup>
        <Textarea placeholder="What happened? (optional)" rows={2} className="rounded-xl" />
        {!p.guest && (
          <Label className="flex items-center gap-2 text-sm font-bold">
            <Checkbox checked={block} onCheckedChange={(v) => setBlock(v === true)} /> Also block {p.name}
          </Label>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-full font-extrabold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason}
            className="rounded-full bg-destructive font-extrabold text-white hover:bg-destructive/90"
            onClick={() => {
              toast.success(`Thanks. ${p.name} was reported${block && !p.guest ? ' and blocked' : ''}.`);
              onOpenChange(false);
              setReason('');
            }}
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
