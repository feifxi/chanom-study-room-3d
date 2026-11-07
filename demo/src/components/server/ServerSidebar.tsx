'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellOff, CalendarHeart, ChevronDown, Hash, House, LogOut, Plus, Settings, UserPlus, Users, VolumeX } from 'lucide-react';
import { UserBar } from '@/components/app/UserBar';
import { UserAvatar } from '@/components/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConnection } from '@/lib/connection';
import { cn } from '@/lib/utils';
import { MAPS, userById, type Server } from '@/lib/mock';
import { InviteDialog } from './InviteDialog';
import { ServerSettingsDialog } from './ServerSettingsDialog';

/**
 * A server's sidebar. Rooms come first (they're the point), each showing who's inside like a voice
 * channel does; chats below. The header menu holds invite and settings.
 */
export function ServerSidebar({ server, className }: { server: Server; className?: string }) {
  const path = usePathname();
  const conn = useConnection();
  const [invite, setInvite] = useState(false);
  const [settings, setSettings] = useState<string | null>(null);

  return (
    <aside className={cn('hidden w-64 flex-none flex-col overflow-hidden rounded-3xl border bg-sidebar shadow-soft md:flex', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn('relative h-24 flex-none bg-gradient-to-br text-left dark:opacity-90', server.banner)}>
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent px-3 pt-6 pb-2">
              <span className={cn('grid size-9 place-items-center rounded-xl text-lg shadow-sm', server.tint)}>{server.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">{server.name}</span>
                <span className="block text-[11px] font-bold text-muted-foreground">
                  {server.memberCount} members{server.boosted ? ` · Level 1 🚀` : ''}
                </span>
              </span>
              <ChevronDown className="size-4" />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 rounded-2xl" align="start">
          <DropdownMenuItem className="font-bold text-primary" onSelect={() => setInvite(true)}>
            <UserPlus /> Invite friends
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettings('overview')}>
            <Settings /> Server settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettings('rooms')}>
            <Plus /> Add a room
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Hash /> Add a chat
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <BellOff /> Mute server
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <LogOut /> Leave server
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          <NavRow
            href={`/servers/${server.id}`}
            active={path === `/servers/${server.id}`}
            icon={<House className="size-4" />}
            label="Server home"
          />
          <button
            onClick={() => setInvite(true)}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-bold text-primary hover:bg-secondary"
          >
            <UserPlus className="size-4" /> Invite friends
          </button>
        </div>

        <SectionHead label="Rooms" onAdd={() => setSettings('rooms')} />
        <div className="flex flex-col gap-1.5 px-2">
          {server.rooms.map((r) => {
            const map = MAPS.find((m) => m.id === r.mapId)!;
            const here = conn?.serverId === server.id && conn.roomId === r.id;
            const people = [...(here ? ['me'] : []), ...r.people].map(userById);
            return (
              <Link
                key={r.id}
                href={`/servers/${server.id}/rooms/${r.id}`}
                className={cn(
                  'rounded-2xl border p-2 transition-colors hover:border-primary/50',
                  here ? 'border-primary/60 bg-secondary/60' : 'bg-card/60',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn('grid size-8 place-items-center rounded-xl text-base', map.tint)}>{map.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-extrabold">
                      {r.name}
                      {r.quiet && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <VolumeX className="size-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Quiet room: no group games</TooltipContent>
                        </Tooltip>
                      )}
                      {r.allowGuests && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Users className="size-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Guests can join with a link</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{r.happening ?? map.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {people.length}/{r.capacity}
                  </span>
                </span>
                {people.length > 0 && (
                  <span className="mt-1.5 flex flex-col gap-0.5 pl-1">
                    {people.map((u) => (
                      <span key={u.id} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <UserAvatar user={u} size={18} />
                        <span className="truncate">{u.id === 'me' ? 'You' : u.name}</span>
                        <span className="ml-auto">{u.presence === 'focus' ? '📖' : u.activity?.startsWith('🎴') ? '🎴' : ''}</span>
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <SectionHead label="Chats" onAdd={() => {}} />
        <div className="flex flex-col gap-0.5 px-2 pb-3">
          {server.channels.map((c) => {
            const active = path === `/servers/${server.id}/chat/${c.id}`;
            return (
              <Link
                key={c.id}
                href={`/servers/${server.id}/chat/${c.id}`}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm',
                  active
                    ? 'bg-card font-extrabold shadow-sm'
                    : c.unread
                      ? 'font-extrabold hover:bg-card/60'
                      : 'font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground',
                )}
              >
                <Hash className="size-4 opacity-60" />
                <span className="truncate">{c.name}</span>
                {c.mention && (
                  <span className="ml-auto grid size-5 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                    @
                  </span>
                )}
                {!c.mention && !!c.unread && <span className="ml-auto size-2 rounded-full bg-foreground/70" />}
              </Link>
            );
          })}
        </div>

        {server.event && (
          <div className="mx-2 mb-3 rounded-2xl bg-lavender p-3 text-lavender-ink">
            <p className="flex items-center gap-1.5 text-xs font-black">
              <CalendarHeart className="size-3.5" /> Next event
            </p>
            <p className="text-sm font-bold">{server.event}</p>
          </div>
        )}
      </ScrollArea>
      <UserBar />
      <InviteDialog server={server} open={invite} onOpenChange={setInvite} />
      <ServerSettingsDialog server={server} tab={settings} onClose={() => setSettings(null)} />
    </aside>
  );
}

function NavRow({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-bold',
        active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
      )}
    >
      {icon} {label}
    </Link>
  );
}

function SectionHead({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="mt-3 flex items-center justify-between px-4 pb-1.5">
      <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">{label}</p>
      <button onClick={onAdd} className="text-muted-foreground hover:text-foreground" aria-label={`Add ${label.toLowerCase()}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
