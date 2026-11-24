'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Compass, Crown, House, LogOut, MessageCircle, Settings, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import { SettingsDialog } from '@/components/app/SettingsDialog';
import { Inbox } from './Inbox';
import { Logo } from '@/components/Logo';
import { UserAvatar } from '@/components/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIsGuest, useMe, useMeAsUser, useSignOut } from '@/features/account/useMe';
import { FriendFace } from '@/features/presence/FriendFace';
import { dmUnread, lastLine, useDms } from '@/features/dms/useDms';
import { useFriendRequests } from '@/features/friends/useFriends';
import { useQuests } from '@/features/quests/useQuests';
import { SIGN_UP_HREF } from '@/features/account/links';

const NAV = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/home/friends', label: 'Friends', icon: Users, badge: 0 },
  { href: '/home/focus', label: 'Focus', icon: BarChart3 },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/home/shop', label: 'Shop', icon: ShoppingBag },
];

/** The nav with live badges: Friends counts the requests waiting for you. */
function useNav() {
  const waiting = useFriendRequests().data?.incoming.length ?? 0;
  return NAV.map((n) => (n.href === '/home/friends' ? { ...n, badge: waiting } : n));
}

/**
 * Place layout's only chrome outside a room: a slim header. There are no server or channel lists;
 * your rooms are cards on Home, and each room's chat lives with the room.
 */
export function PlaceHeader() {
  const path = usePathname();
  const guest = useIsGuest();
  // Guests only reach Discover (Common rooms take anyone); everything else needs an account
  const all = useNav();
  const nav = guest ? all.filter((n) => n.href === '/discover') : all;
  return (
    <header className="flex h-14 flex-none items-center gap-2 px-1 sm:gap-4 sm:px-2">
      {/* Guests have no Home (it needs an account), so the logo takes them to Discover */}
      <Link href={guest ? '/discover' : '/home'} aria-label="Connecta home" className="flex-none">
        <Logo />
      </Link>
      {/* Phones get the tab bar at the bottom instead (PhoneTabs): five tabs don't fit beside the buttons */}
      <nav className="hidden min-w-0 items-center gap-1 sm:flex" aria-label="App">
        {nav.map((n) => {
          const active = isActive(n.href, path);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold',
                active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <n.icon className="size-4" />
              <span className={cn(!active && 'hidden md:inline')}>{n.label}</span>
              {!!n.badge && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex flex-none items-center gap-2">
        {guest ? (
          <Link href={SIGN_UP_HREF} className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">
            Sign up
          </Link>
        ) : (
          <>
            <Inbox />
            <Messages />
            <Me />
          </>
        )}
      </div>
    </header>
  );
}

const isActive = (href: string, path: string) => (href === '/home' ? path === '/home' : path.startsWith(href));

/**
 * The phone tab bar under Home's pages, like Instagram's or Discord's: thumb-reachable and every tab
 * always visible. Guests have only Discover, so they get no bar.
 */
export function PhoneTabs() {
  const path = usePathname();
  const guest = useIsGuest();
  const nav = useNav();
  // Inside a DM thread the composer owns the bottom edge (Instagram hides its tabs there too)
  if (guest || /^\/home\/messages\/./.test(path)) return null;
  return (
    <nav
      className="flex flex-none items-stretch justify-around rounded-3xl border bg-card px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-soft sm:hidden"
      aria-label="App"
    >
      {nav.map((n) => {
        const active = isActive(n.href, path);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-extrabold',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', active && 'bg-secondary')}>
              <n.icon className="size-5" />
            </span>
            {n.label}
            {!!n.badge && (
              <span className="absolute top-0.5 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full border-2 border-card bg-primary px-1 text-[9px] font-black text-primary-foreground">
                {n.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** DMs aren't tied to a place, so they're one button away from anywhere. */
function Messages() {
  const [open, setOpen] = useState(false);
  const dms = useDms();
  const unread = dmUnread(dms.data);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative grid size-10 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
        >
          <MessageCircle className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-card bg-primary px-1 text-[10px] font-black text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-3xl p-2">
        <p className="px-2 pt-1 pb-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Messages</p>
        {dms.data?.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No messages yet. Say hi to a friend 👋</p>}
        {dms.data?.slice(0, 6).map((d) => (
          <Link
            key={d.id}
            href={`/home/messages/${d.with.handle}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5 hover:bg-muted"
          >
            <FriendFace who={d.with} size={34} />
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-sm', d.unread ? 'font-black' : 'font-semibold')}>{d.with.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{lastLine(d)}</span>
            </span>
            {d.unread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                {d.unread}
              </span>
            )}
          </Link>
        ))}
        <Link
          href="/home/messages"
          onClick={() => setOpen(false)}
          className="mt-1 block rounded-2xl px-2 py-2 text-center text-sm font-extrabold text-primary hover:bg-muted"
        >
          See all messages
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function Me() {
  const [settings, setSettings] = useState(false);
  const me = useMeAsUser();
  // The admin site's link only for the Connecta team (set by a script, feature 14)
  const team = !!useMe().data?.team;
  const signOut = useSignOut();
  const router = useRouter();
  const { coins } = useQuests();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hop rounded-full" aria-label="You">
            <UserAvatar user={me} size={40} presence />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-2xl">
          <DropdownMenuLabel className="flex items-center gap-2.5">
            <UserAvatar user={me} size={36} presence />
            <span>
              <span className="block font-black">{me.name}</span>
              <span className="block text-xs font-semibold text-muted-foreground">
                {me.presence === 'offline' ? 'Appearing offline' : 'Online'}
                {me.plus && ' · Plus ✨'}
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSettings(true)}>
            <Settings /> Character & settings
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/home/shop">
              <ShoppingBag /> Shop <span className="ml-auto font-mono text-xs text-muted-foreground">🪙 {coins.toLocaleString()}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/home/plus">
              <Crown /> Connecta Plus
            </Link>
          </DropdownMenuItem>
          {team && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck /> Admin site <span className="ml-auto text-[10px] font-black text-muted-foreground">TEAM</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={async () => {
              await signOut();
              router.push('/');
            }}
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settings} onOpenChange={setSettings} />
    </>
  );
}
