'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Menu, MessageCircle, ShoppingBag, Users } from 'lucide-react';
import { HomeSidebar } from '@/components/app/HomeSidebar';
import { ServerRail } from '@/components/app/ServerRail';
import { ServerSidebar } from '@/components/server/ServerSidebar';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { DMS, FRIEND_REQUESTS, serverById } from '@/lib/mock';

/**
 * Phones: the rail and the section's sidebar don't fit beside the content, so they slide in from
 * the left (like Discord's mobile app) and a small tab bar along the bottom opens them.
 */
export function MobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const server = path.startsWith('/servers/') ? serverById(path.split('/')[2] ?? '') : undefined;
  const dmUnread = DMS.reduce((n, d) => n + (d.unread ?? 0), 0);

  const tabs = [
    { href: '/home', label: 'Home', icon: House, active: path === '/home' },
    { href: '/home/friends', label: 'Friends', icon: Users, active: path.startsWith('/home/friends'), badge: FRIEND_REQUESTS.length },
    {
      href: `/home/messages/${DMS[0]!.id}`,
      label: 'Messages',
      icon: MessageCircle,
      active: path.startsWith('/home/messages'),
      badge: dmUnread,
    },
    { href: '/home/shop', label: 'Shop', icon: ShoppingBag, active: path.startsWith('/home/shop') },
  ];

  return (
    <>
      <nav
        className="fixed inset-x-2 bottom-2 z-40 flex items-center justify-around rounded-3xl border bg-card/95 p-1.5 shadow-soft backdrop-blur md:hidden"
        aria-label="App"
      >
        <TabButton label={server ? server.name : 'Menu'} icon={Menu} active={open} onClick={() => setOpen(true)} />
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={tabClass(t.active)}>
            <span className="relative">
              <t.icon className="size-5" />
              {!!t.badge && (
                <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                  {t.badge}
                </span>
              )}
            </span>
            {t.label}
          </Link>
        ))}
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-auto max-w-[calc(100%-3rem)] flex-row gap-2 border-0 bg-transparent p-2 shadow-none"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Your servers and this section’s pages</SheetDescription>
          {/* Any tap on a link inside closes the drawer, so the page it opens is visible */}
          <div className="flex min-h-0 flex-1 gap-2" onClickCapture={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
            <ServerRail className="flex" />
            {server ? <ServerSidebar server={server} className="flex w-64" /> : <HomeSidebar className="flex w-64" />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

const tabClass = (active: boolean) =>
  cn(
    'flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-extrabold',
    active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground',
  );

function TabButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Menu; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(tabClass(active), 'max-w-20')}>
      <Icon className="size-5" />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
