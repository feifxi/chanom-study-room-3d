'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Plus, ShoppingBag } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DMS, SERVERS } from '@/lib/mock';
import { CreateServerDialog } from './CreateServerDialog';

/**
 * The slim rail on the far left: Home, your servers as little sticker tiles, then create and discover.
 * The active tile gets a soft ring and a small dot instead of Discord's pill.
 */
export function ServerRail({ className }: { className?: string }) {
  const path = usePathname();
  const [creating, setCreating] = useState(false);
  const dmUnread = DMS.reduce((n, d) => n + (d.unread ?? 0), 0);
  const homeActive = path.startsWith('/home') && !path.startsWith('/home/shop');

  return (
    <nav
      className={cn('hidden w-[68px] flex-none flex-col items-center gap-2 rounded-3xl bg-rail py-3 md:flex', className)}
      aria-label="Servers"
    >
      <RailItem href="/home" label="Home" active={homeActive} badge={dmUnread}>
        <span className="grid size-full place-items-center bg-card">
          <LogoMark size={26} />
        </span>
      </RailItem>
      <span className="my-1 h-0.5 w-8 rounded-full bg-border" />
      {SERVERS.map((s) => {
        const unread = s.channels.reduce((n, c) => n + (c.unread ?? 0), 0);
        const live = s.rooms.reduce((n, r) => n + r.people.length, 0);
        return (
          <RailItem
            key={s.id}
            href={`/servers/${s.id}`}
            label={s.name}
            active={path.startsWith(`/servers/${s.id}`)}
            badge={unread}
            live={live > 0}
          >
            <span className={cn('grid size-full place-items-center text-xl', s.tint)}>{s.emoji}</span>
          </RailItem>
        );
      })}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setCreating(true)}
            className="grid size-12 place-items-center rounded-2xl border-2 border-dashed border-primary/40 text-primary transition-colors hover:border-primary hover:bg-secondary"
            aria-label="Create or join a server"
          >
            <Plus className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Create or join a server</TooltipContent>
      </Tooltip>
      <RailItem href="/discover" label="Discover" active={path.startsWith('/discover')}>
        <span className="grid size-full place-items-center bg-card text-mint-ink">
          <Compass className="size-5" />
        </span>
      </RailItem>
      <div className="mt-auto">
        <RailItem href="/home/shop" label="Shop" active={path.startsWith('/home/shop')}>
          <span className="grid size-full place-items-center bg-card text-peach-ink">
            <ShoppingBag className="size-5" />
          </span>
        </RailItem>
      </div>
      <CreateServerDialog open={creating} onOpenChange={setCreating} />
    </nav>
  );
}

function RailItem({
  href,
  label,
  active,
  badge,
  live,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} aria-label={label} aria-current={active ? 'page' : undefined} className="group relative block">
          <span
            className={cn(
              'hop block size-12 overflow-hidden rounded-2xl shadow-sm transition-all',
              active
                ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-rail'
                : 'group-hover:ring-2 group-hover:ring-primary/40 group-hover:ring-offset-2 group-hover:ring-offset-rail',
            )}
          >
            {children}
          </span>
          {!!badge && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-rail bg-primary px-1 text-[10px] font-black text-primary-foreground">
              {badge}
            </span>
          )}
          {live && (
            <span
              className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-rail bg-online"
              aria-label="People in a room"
            />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-bold">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
