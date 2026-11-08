'use client';

import { useState, type ReactNode } from 'react';
import { Ban, Check, Clock, MoreHorizontal, ShieldCheck, ShieldOff, UserMinus, X } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { userById } from '@/lib/mock';
import {
  BANS,
  INVITE_LINKS,
  JOIN_REQUESTS,
  REQUEST_COOLDOWN_DAYS,
  ROLE_RULES,
  TIMEOUTS,
  type JoinRequest,
  type Outsider,
  type RoomBan,
  type RoomRole,
} from './membership';
import { planOf, type PlaceRoom } from './model';

/** Can `me` act on someone with `their` role? Owner: anyone but themselves. Mod: members only. */
export const canActOn = (me: RoomRole | undefined, their: RoomRole) =>
  me === 'Owner' ? their !== 'Owner' : me === 'Mod' ? their === 'Member' : false;

/**
 * Members & roles: who belongs, join requests (Ask to join rooms) and the banned list. Kick, ban,
 * time out and make mod sit in each person's "…", the same actions as the in-room people list.
 */
export function MembersPanel({ room, myRole }: { room: PlaceRoom; myRole: RoomRole | undefined }) {
  const asks = room.server.visibility === 'request';
  const [view, setView] = useState<'members' | 'requests' | 'banned'>('members');
  const [ids, setIds] = useState(room.server.members);
  const [roles, setRoles] = useState<Record<string, RoomRole>>(room.server.roles);
  const [timedOut, setTimedOut] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<JoinRequest[]>(asks ? JOIN_REQUESTS : []);
  const [bans, setBans] = useState<RoomBan[]>(BANS);

  const views: [typeof view, string, number][] = [
    ['members', 'Members', ids.length],
    ...(asks ? [['requests', 'Requests', requests.length] as [typeof view, string, number]] : []),
    ['banned', 'Banned', bans.length],
  ];

  const remove = (id: string, ban: boolean) => {
    const name = userById(id).name;
    setIds((l) => l.filter((x) => x !== id));
    if (ban) {
      setBans((b) => [{ id: `b-${id}`, who: { name, color: userById(id).color }, by: 'you', at: 'Just now' }, ...b]);
      toast(`${name} was banned. They can’t rejoin or use guest passes for this room.`);
    } else toast(`${name} was removed. A new invite lets them back in.`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Members and capacity are two different limits; say so where people manage them */}
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="rounded-2xl bg-muted p-3 text-sm">
          <span className="block text-lg font-black">
            {room.server.memberCount}/{planOf(room.ownerPlus).members}
          </span>
          members. They have the Room chat any time, from anywhere. Free rooms hold 150; the owner’s Plus raises it to 1,000.
        </p>
        <p className="rounded-2xl bg-muted p-3 text-sm">
          <span className="block text-lg font-black">
            {room.inside}/{room.capacity}
          </span>
          inside right now. When it’s full, members wait for a spot (or ask to be told). The owner and mods always fit.
        </p>
      </div>

      <div className="flex gap-1 rounded-2xl bg-muted p-1">
        {views.map(([id, label, n]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-bold',
              view === id ? 'bg-card shadow-sm' : 'text-muted-foreground',
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 text-[11px] font-black',
                id === 'requests' && n > 0 ? 'bg-primary text-primary-foreground' : 'bg-card/70',
              )}
            >
              {n}
            </span>
          </button>
        ))}
      </div>

      {view === 'members' && (
        <>
          {ids.map((id) => {
            const u = userById(id);
            const role = roles[id] ?? 'Member';
            return (
              <div key={id} className="flex items-center gap-3 rounded-2xl border p-2.5">
                <UserAvatar user={u} size={34} presence />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{id === 'me' ? `${u.name} (you)` : u.name}</span>
                  {timedOut[id] && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-tea-ink">
                      <Clock className="size-3" /> Timed out · {timedOut[id]}
                    </span>
                  )}
                </span>
                <RolePill role={role} />
                {id !== 'me' && canActOn(myRole, role) ? (
                  <MemberMenu
                    name={u.name}
                    role={role}
                    isOwner={myRole === 'Owner'}
                    onRole={(r) => {
                      setRoles((all) => ({ ...all, [id]: r }));
                      toast.success(r === 'Mod' ? `${u.name} is now a mod` : `${u.name} is no longer a mod`);
                    }}
                    onTimeout={(label) => {
                      setTimedOut((t) => ({ ...t, [id]: label }));
                      toast(`${u.name} can’t talk or type for ${label}`);
                    }}
                    onRemove={(ban) => remove(id, ban)}
                  />
                ) : (
                  <span className="size-8" />
                )}
              </div>
            );
          })}
          <RoleGuide />
        </>
      )}

      {view === 'requests' &&
        (requests.length ? (
          <>
            {requests.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-2xl border p-3">
                <Face who={r.who} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {r.who.name} <span className="text-xs font-semibold text-muted-foreground">· {r.at}</span>
                  </p>
                  {r.note && <p className="text-sm">“{r.note}”</p>}
                  {r.mutual && <p className="text-xs text-muted-foreground">{r.mutual}</p>}
                </div>
                <Button
                  size="sm"
                  className="rounded-full font-bold"
                  onClick={() => {
                    setRequests((l) => l.filter((x) => x.id !== r.id));
                    toast.success(`${r.who.name} is a member now`);
                  }}
                >
                  <Check /> Let in
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full font-bold"
                  aria-label={`Decline ${r.who.name}`}
                  onClick={() => {
                    setRequests((l) => l.filter((x) => x.id !== r.id));
                    toast(`Declined. ${r.who.name} can ask again in ${REQUEST_COOLDOWN_DAYS} days.`);
                  }}
                >
                  <X />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Mods get a notification for each request. Someone declined can ask again after {REQUEST_COOLDOWN_DAYS} days.
            </p>
          </>
        ) : (
          <Empty>No one’s waiting. New requests show up here and as a badge on the room.</Empty>
        ))}

      {view === 'banned' &&
        (bans.length ? (
          bans.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
              <Face who={b.who} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{b.who.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {b.reason ? `${b.reason} · ` : ''}by {b.by} · {b.at}
                </span>
              </span>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full font-bold"
                onClick={() => {
                  setBans((l) => l.filter((x) => x.id !== b.id));
                  toast(`${b.who.name} is unbanned. They’ll need a new invite to come back.`);
                }}
              >
                Unban
              </Button>
            </div>
          ))
        ) : (
          <Empty>Nobody’s banned. A ban is tied to the account, so a new guest name doesn’t get around it.</Empty>
        ))}
    </div>
  );
}

function MemberMenu({
  name,
  role,
  isOwner,
  onRole,
  onTimeout,
  onRemove,
}: {
  name: string;
  role: RoomRole;
  isOwner: boolean;
  onRole: (role: RoomRole) => void;
  onTimeout: (label: string) => void;
  onRemove: (ban: boolean) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label={`More for ${name}`}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {isOwner && (
          <DropdownMenuItem onSelect={() => onRole(role === 'Mod' ? 'Member' : 'Mod')}>
            {role === 'Mod' ? <ShieldOff /> : <ShieldCheck />} {role === 'Mod' ? 'Remove mod' : 'Make mod'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Clock /> Time out
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {TIMEOUTS.map(([id, label]) => (
              <DropdownMenuItem key={id} onSelect={() => onTimeout(label)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRemove(false)}>
          <UserMinus /> Kick
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onRemove(true)}>
          <Ban /> Ban
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Three fixed roles; spelled out where the owner hands them out. */
function RoleGuide() {
  return (
    <details className="mt-1 rounded-2xl bg-muted/60 p-3 text-sm">
      <summary className="cursor-pointer font-extrabold">What can each role do?</summary>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {ROLE_RULES.map((r) => (
          <div key={r.role}>
            <RolePill role={r.role} />
            <ul className="mt-1.5 flex flex-col gap-0.5 text-xs">
              {r.can.map((c) => (
                <li key={c} className="flex gap-1">
                  <Check className="mt-0.5 size-3 flex-none text-primary" /> {c}
                </li>
              ))}
              {r.cannot?.map((c) => (
                <li key={c} className="flex gap-1 text-muted-foreground">
                  <X className="mt-0.5 size-3 flex-none" /> {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function RolePill({ role }: { role: RoomRole }) {
  return (
    <span
      className={cn(
        'w-fit flex-none rounded-full px-2.5 py-0.5 text-xs font-bold',
        role === 'Owner' ? 'bg-peach text-peach-ink' : role === 'Mod' ? 'bg-lavender text-lavender-ink' : 'bg-muted',
      )}
    >
      {role}
    </span>
  );
}

function Face({ who }: { who: Outsider }) {
  return <UserAvatar user={{ name: who.name, color: who.color, presence: 'offline' }} size={34} />;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Invites: who may make links, plus every active link with how it's doing and a way to cancel it. */
export function InvitesPanel({ toggles }: { toggles: ReactNode }) {
  const [links, setLinks] = useState(INVITE_LINKS);
  return (
    <div className="flex flex-col gap-5">
      {toggles}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-extrabold">Active links</p>
        {links.length === 0 && <Empty>No active links. Make one from Invite.</Empty>}
        {links.map((l) => (
          <div key={l.code} className="flex items-center gap-3 rounded-2xl border p-2.5">
            <span
              className={cn(
                'flex-none rounded-full px-2 py-0.5 text-[11px] font-black',
                l.kind === 'guest' ? 'bg-peach text-peach-ink' : 'bg-secondary text-secondary-foreground',
              )}
            >
              {l.kind === 'guest' ? 'Guest pass' : 'Member'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm">
                connecta.app/{l.kind === 'guest' ? 'g' : 'i'}/{l.code}
              </span>
              <span className="block text-xs text-muted-foreground">
                by {l.by} · {l.uses}
                {l.maxUses ? `/${l.maxUses}` : ''} uses · expires {l.expires}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full font-bold text-destructive"
              onClick={() => {
                setLinks((all) => all.filter((x) => x.code !== l.code));
                toast('Link cancelled. It stops working right away.');
              }}
            >
              Cancel
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
