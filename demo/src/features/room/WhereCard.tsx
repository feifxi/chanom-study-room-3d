'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Hash, Link2, LogOut, Settings, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { InviteDialog } from '@/components/server/InviteDialog';
import { ServerSettingsDialog } from '@/components/server/ServerSettingsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DMS, MAPS, userById, type Room, type Server } from '@/lib/mock';
import type { ChatTarget } from './ChannelOverlay';

/** The emoji at the start of someone's activity ("📖 Focusing · …" → 📖), shown after their name. */
const activityIcon = (id: string) => userById(id).activity?.match(/^\p{Extended_Pictographic}/u)?.[0] ?? '';

/**
 * Top left: where you are. Collapsed it's the server and room with Leave. Expanded it has two tabs:
 * Server (this server only: its chats, which open as a big panel over the room, and its rooms to
 * walk into) and Messages (your DMs). Back (←) still goes to the server page for everything else.
 */
export function WhereCard({
  server,
  room,
  here,
  guest,
  onLeave,
  onOpenChat,
  className,
}: {
  server: Server;
  room: Room;
  /** Names of the people in this room right now, you first. */
  here: string[];
  guest: boolean;
  onLeave: () => void;
  onOpenChat: (target: ChatTarget) => void;
  className?: string;
}) {
  const router = useRouter();
  const isPublic = server.id === 'public';
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState(false);
  const [settings, setSettings] = useState<string | null>(null);
  const [tab, setTab] = useState<'server' | 'dms'>('server');
  const serverUnread = server.channels.reduce((n, c) => n + (c.unread ?? 0), 0);
  const dmUnread = DMS.reduce((n, d) => n + (d.unread ?? 0), 0);
  const map = MAPS.find((m) => m.id === room.mapId)!;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="panel flex items-center gap-2 p-2">
        {!guest && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={isPublic ? '/discover' : `/servers/${server.id}`}
                className="grid size-9 flex-none place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Back (you stay in the room)"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>{isPublic ? 'Back to Discover' : 'Back to the server'} · you stay in the room</TooltipContent>
          </Tooltip>
        )}
        <button
          onClick={() => !guest && setOpen(!open)}
          disabled={guest}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl text-left"
        >
          <span className={cn('grid size-11 flex-none place-items-center rounded-2xl text-xl', server.tint)}>{server.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[15px] font-black">
              <span className="truncate">{server.name}</span>
              {!guest && <ChevronDown className={cn('size-4 flex-none transition-transform', open && 'rotate-180')} />}
            </span>
            <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span className="size-2 flex-none rounded-full bg-online" />
              {map.emoji} {room.name} · {here.length} here
              {room.quiet && <VolumeX className="size-3 flex-none" aria-label="Quiet room" />}
              {guest && <span className="rounded-full bg-peach px-1.5 text-[10px] font-black text-peach-ink">guest</span>}
            </span>
          </span>
        </button>
        <button
          onClick={onLeave}
          className="flex flex-none items-center gap-1.5 rounded-full border bg-card px-3 py-2 text-sm font-extrabold hover:border-destructive/40 hover:text-destructive"
        >
          <LogOut className="size-4" /> Leave
        </button>
      </div>

      {open && (
        <div className="panel flex max-h-[calc(100dvh-110px)] flex-col gap-3 overflow-y-auto p-3">
          {/* Two tabs so the server's own stuff and your personal DMs never mix */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {(
              [
                ['server', `${server.emoji} Server`, serverUnread],
                ['dms', 'Messages', dmUnread],
              ] as const
            ).map(([id, label, unread]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-extrabold',
                  tab === id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                {!!unread && tab !== id && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">{unread}</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'server' ? (
            <>
              {!!server.channels.length && (
                <section>
                  <h3 className="px-1 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Chats</h3>
                  {server.channels.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setOpen(false);
                        onOpenChat({ kind: 'channel', id: c.id });
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <Hash className="size-4 text-muted-foreground" />
                      <span className={cn('flex-1 truncate', c.unread ? 'font-black' : 'font-bold text-muted-foreground')}>{c.name}</span>
                      {!!c.unread && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </section>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Rooms</h3>
                {server.rooms.map((r) => {
                  const current = r.id === room.id;
                  const names = current ? here : r.people.map((id) => `${userById(id).name} ${activityIcon(id)}`.trim());
                  const m = MAPS.find((x) => x.id === r.mapId)!;
                  return (
                    <div
                      key={r.id}
                      className={cn('rounded-2xl border-2 p-3', current ? 'border-primary/50 bg-secondary' : 'border-border bg-card')}
                    >
                      <div className="flex items-center gap-2">
                        <span>{m.emoji}</span>
                        <span className="flex-1 truncate font-black">{r.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {current ? here.length : r.people.length}/{r.capacity}
                        </span>
                        {!current && (
                          <button
                            onClick={() => {
                              toast(`Walking over to ${r.name}…`);
                              router.push(`/servers/${server.id}/rooms/${r.id}`);
                            }}
                            className="rounded-full border bg-card px-3 py-1 text-xs font-extrabold hover:border-primary hover:text-primary"
                          >
                            Walk in
                          </button>
                        )}
                      </div>
                      {!!names.length && (
                        <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                          {names.slice(0, 4).map((n, i) => (
                            <span key={i}>{n}</span>
                          ))}
                          {names.length > 4 && <span>+{names.length - 4}</span>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>
              <div className="flex gap-2">
                <button
                  onClick={() => (isPublic ? toast.success('Room link copied') : setInvite(true))}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
                >
                  <Link2 className="size-4" /> Invite friends
                </button>
                {!isPublic && (
                  <button
                    onClick={() => setSettings('overview')}
                    className="flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-extrabold hover:bg-muted"
                  >
                    <Settings className="size-4" /> Settings
                  </button>
                )}
              </div>
            </>
          ) : (
            <section>
              {DMS.map((d) => {
                const u = userById(d.with);
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setOpen(false);
                      onOpenChat({ kind: 'dm', id: d.id });
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <UserAvatar user={u} size={26} presence />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', d.unread ? 'font-black' : 'font-bold text-muted-foreground')}>
                        {u.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">{d.messages.at(-1)?.text}</span>
                    </span>
                    {!!d.unread && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
                        {d.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          )}
        </div>
      )}

      {!isPublic && (
        <>
          <InviteDialog server={server} open={invite} onOpenChange={setInvite} />
          <ServerSettingsDialog server={server} tab={settings} onClose={() => setSettings(null)} />
        </>
      )}
    </div>
  );
}
