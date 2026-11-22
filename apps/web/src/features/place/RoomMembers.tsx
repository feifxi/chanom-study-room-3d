'use client';

import { useState, type ReactNode } from 'react';
import { Ban, Check, Clock, MoreHorizontal, ShieldCheck, ShieldOff, UserMinus, X } from 'lucide-react';
import { canActOn, REQUEST_COOLDOWN_DAYS, type RoomRole, type Timeout } from '@connecta/shared';
import { toast } from 'sonner';
import { PersonFace } from '@/components/PersonFace';
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
import { useMe } from '@/features/account/useMe';
import { inviteUrl, roomsApi, useBans, useInvites, useMembers, useRequests, useRoomAction } from '@/features/rooms/useRooms';
import { ago } from '@/lib/mock';
import { cn } from '@/lib/utils';
import { ROLE_RULES, TIMEOUTS } from './membership';
import { ROLE_LABEL, type PlaceRoom } from './model';

const DAY_MS = 24 * 60 * 60 * 1000;
const since = (iso: string) => ago(Math.floor((Date.now() - Date.parse(iso)) / DAY_MS));
const until = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });

const Face = PersonFace;

/**
 * Members & roles: who belongs, join requests (Ask to join rooms) and the banned list. Kick, ban,
 * time out and make mod sit in each person's "…", the same actions as the in-room people list.
 */
export function MembersPanel({ room }: { room: PlaceRoom }) {
  const r = room.room;
  const asks = r.visibility === 'request';
  const myRole = room.myRole;
  const { data: me } = useMe();
  const [view, setView] = useState<'members' | 'requests' | 'banned'>('members');
  const members = useMembers(room.id);
  const requests = useRequests(room.id, asks);
  const bans = useBans(room.id);

  const act = useRoomAction(async (run: () => Promise<unknown>) => run());
  const say = (text: string) => () => toast(text);
  const id = room.id;

  const views: [typeof view, string, number][] = [
    ['members', 'Members', members.data?.length ?? r.memberCount],
    ...(asks ? [['requests', 'Requests', requests.data?.length ?? r.requestCount] as [typeof view, string, number]] : []),
    ['banned', 'Banned', bans.data?.length ?? 0],
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Members and capacity are two different limits; say so where people manage them */}
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="rounded-2xl bg-muted p-3 text-sm">
          <span className="block text-lg font-black">
            {r.memberCount}/{r.maxMembers.toLocaleString()}
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
        {views.map(([v, label, n]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-bold',
              view === v ? 'bg-card shadow-sm' : 'text-muted-foreground',
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 text-[11px] font-black',
                v === 'requests' && n > 0 ? 'bg-primary text-primary-foreground' : 'bg-card/70',
              )}
            >
              {n}
            </span>
          </button>
        ))}
      </div>

      {view === 'members' && (
        <>
          {members.isPending && <Empty>Loading members…</Empty>}
          {members.data?.map((m) => {
            const mine = m.person.id === me?.id;
            const name = m.person.name;
            return (
              <div key={m.person.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
                <Face who={m.person} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {mine ? `${name} (you)` : name}
                    {m.person.handle && <span className="ml-1.5 text-xs font-semibold text-muted-foreground">@{m.person.handle}</span>}
                  </span>
                  {m.timedOutUntil && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-tea-ink">
                      <Clock className="size-3" /> Timed out until {until(m.timedOutUntil)}
                    </span>
                  )}
                </span>
                <RolePill role={m.role} />
                {!mine && canActOn(myRole, m.role) ? (
                  <MemberMenu
                    name={name}
                    role={m.role}
                    isOwner={myRole === 'owner'}
                    onRole={(role) =>
                      act.mutate(() =>
                        roomsApi
                          .setRole({ id, userId: m.person.id, role })
                          .then(say(role === 'mod' ? `${name} is now a mod` : `${name} is no longer a mod`)),
                      )
                    }
                    onTimeout={(duration, label) =>
                      act.mutate(() =>
                        roomsApi.timeOut({ id, userId: m.person.id, duration }).then(say(`${name} can’t talk or type for ${label}`)),
                      )
                    }
                    onRemove={(ban) =>
                      act.mutate(() =>
                        ban
                          ? roomsApi
                              .ban({ id, userId: m.person.id })
                              .then(say(`${name} was banned. They can’t rejoin or use guest passes for this room.`))
                          : roomsApi.kick({ id, userId: m.person.id }).then(say(`${name} was removed. A new invite lets them back in.`)),
                      )
                    }
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
        (requests.data?.length ? (
          <>
            {requests.data.map((q) => (
              <div key={q.person.id} className="flex items-start gap-3 rounded-2xl border p-3">
                <Face who={q.person} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {q.person.name} <span className="text-xs font-semibold text-muted-foreground">· {since(q.at)}</span>
                  </p>
                  {q.person.handle && <p className="text-xs text-muted-foreground">@{q.person.handle}</p>}
                  {q.note && <p className="text-sm">“{q.note}”</p>}
                </div>
                <Button
                  size="sm"
                  className="rounded-full font-bold"
                  disabled={act.isPending}
                  onClick={() =>
                    act.mutate(() =>
                      roomsApi.decide({ id, userId: q.person.id, letIn: true }).then(say(`${q.person.name} is a member now`)),
                    )
                  }
                >
                  <Check /> Let in
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full font-bold"
                  aria-label={`Decline ${q.person.name}`}
                  disabled={act.isPending}
                  onClick={() =>
                    act.mutate(() =>
                      roomsApi
                        .decide({ id, userId: q.person.id, letIn: false })
                        .then(say(`Declined. ${q.person.name} can ask again in ${REQUEST_COOLDOWN_DAYS} days.`)),
                    )
                  }
                >
                  <X />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Someone declined can ask again after {REQUEST_COOLDOWN_DAYS} days. Mods get a notification for each request once notifications
              are on.
            </p>
          </>
        ) : (
          <Empty>No one’s waiting. New requests show up here and as a badge on the room.</Empty>
        ))}

      {view === 'banned' &&
        (bans.data?.length ? (
          bans.data.map((b) => (
            <div key={b.person.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
              <Face who={b.person} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{b.person.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {b.reason ? `${b.reason} · ` : ''}by {b.by?.name ?? 'a mod'} · {since(b.at)}
                </span>
              </span>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full font-bold"
                disabled={act.isPending}
                onClick={() =>
                  act.mutate(() =>
                    roomsApi
                      .unban({ id, userId: b.person.id })
                      .then(say(`${b.person.name} is unbanned. They’ll need a new invite to come back.`)),
                  )
                }
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
  onRole: (role: 'mod' | 'member') => void;
  onTimeout: (duration: Timeout, label: string) => void;
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
          <DropdownMenuItem onSelect={() => onRole(role === 'mod' ? 'member' : 'mod')}>
            {role === 'mod' ? <ShieldOff /> : <ShieldCheck />} {role === 'mod' ? 'Remove mod' : 'Make mod'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Clock /> Time out
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {TIMEOUTS.map(([id, label]) => (
              <DropdownMenuItem key={id} onSelect={() => onTimeout(id, label)}>
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
        role === 'owner' ? 'bg-peach text-peach-ink' : role === 'mod' ? 'bg-lavender text-lavender-ink' : 'bg-muted',
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Invites: who may make links, plus every active link with how it's doing and a way to cancel it. */
export function InvitesPanel({ room, toggles }: { room: PlaceRoom; toggles: ReactNode }) {
  const invites = useInvites(room.id);
  const cancel = useRoomAction(roomsApi.cancelInvite, () => toast('Link cancelled. It stops working right away.'));
  return (
    <div className="flex flex-col gap-5">
      {toggles}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-extrabold">Active links</p>
        {invites.isPending && <Empty>Loading links…</Empty>}
        {invites.data?.length === 0 && <Empty>No active links. Make one from Invite.</Empty>}
        {invites.data?.map((l) => (
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
              <span className="block truncate font-mono text-sm">{inviteUrl(l).replace(/^https?:\/\//, '')}</span>
              <span className="block text-xs text-muted-foreground">
                by {l.by?.name ?? 'someone who left'} · used {l.uses} {l.uses === 1 ? 'time' : 'times'} ·{' '}
                {l.expiresAt ? `until ${until(l.expiresAt)}` : 'never expires'}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full font-bold text-destructive"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(l.code)}
            >
              Cancel
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
