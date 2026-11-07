'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Crown, House, Plus, ShoppingBag, Users } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DMS, FRIEND_REQUESTS, userById } from '@/lib/mock';
import { UserBar } from './UserBar';

const NAV = [
  { href: '/home', label: 'Home', icon: House, tint: 'bg-secondary text-secondary-foreground' },
  { href: '/home/friends', label: 'Friends', icon: Users, tint: 'bg-lavender text-lavender-ink', badge: FRIEND_REQUESTS.length },
  { href: '/discover', label: 'Discover', icon: Compass, tint: 'bg-mint text-mint-ink' },
  { href: '/home/shop', label: 'Shop', icon: ShoppingBag, tint: 'bg-peach text-peach-ink' },
  { href: '/home/plus', label: 'Connecta Plus', icon: Crown, tint: 'bg-sky text-sky-ink' },
];

/** Home's sidebar: your places (home, friends, discover, shop, plus) and your direct messages. */
export function HomeSidebar({ className }: { className?: string }) {
  const path = usePathname();
  return (
    <aside className={cn('hidden w-64 flex-none flex-col overflow-hidden rounded-3xl border bg-sidebar shadow-soft md:flex', className)}>
      <div className="p-3">
        <button className="h-9 w-full rounded-xl bg-muted px-3 text-left text-sm font-semibold text-muted-foreground hover:text-foreground">
          Find a friend or chat…
        </button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map((n) => {
            const active = n.href === '/home' ? path === '/home' : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl px-2 py-1.5 text-sm font-bold',
                  active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                )}
              >
                <span className={cn('grid size-8 place-items-center rounded-xl', n.tint)}>
                  <n.icon className="size-4" />
                </span>
                {n.label}
                {!!n.badge && (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                    {n.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 flex items-center justify-between px-4 pb-1">
          <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Messages</p>
          <button className="text-muted-foreground hover:text-foreground" aria-label="New message">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {DMS.map((d) => {
            const u = userById(d.with);
            const active = path === `/home/messages/${d.id}`;
            return (
              <Link
                key={d.id}
                href={`/home/messages/${d.id}`}
                className={cn('flex items-center gap-2.5 rounded-2xl px-2 py-1.5', active ? 'bg-card shadow-sm' : 'hover:bg-card/60')}
              >
                <UserAvatar user={u} size={34} presence />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', d.unread ? 'font-black' : 'font-semibold')}>{u.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{u.activity ?? d.messages.at(-1)?.text}</span>
                </span>
                {!!d.unread && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                    {d.unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </ScrollArea>
      <UserBar />
    </aside>
  );
}
