'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PALETTES, usePalette } from './Providers';

const PAGES = [
  ['Landing', '/'],
  ['Sign in', '/login'],
  ['Home', '/home'],
  ['Friends', '/home/friends'],
  ['DM with Mai', '/home/messages/mai'],
  ['Shop', '/home/shop'],
  ['Connecta Plus', '/home/plus'],
  ['Discover', '/discover'],
  ['Server home', '/servers/chanom'],
  ['Text channel', '/servers/chanom/chat/general'],
  ['3D room', '/servers/chanom/rooms/library'],
  ['Invite (guest)', '/invite/cafe-chanom'],
] as const;

/** Demo-only chrome: switch theme and palette, jump to any page. Not part of the app design. */
export function DemoToolbar() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          // A tab on the right edge, mid-height: clear of every page's header, dock and composer
          className="fixed top-1/2 right-0 z-[60] flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-dashed border-primary/60 bg-card/90 px-1 py-2 text-[10px] font-extrabold text-muted-foreground shadow-soft backdrop-blur [writing-mode:vertical-rl] hover:text-foreground"
          aria-label="Demo controls"
        >
          <Palette className="size-3.5" /> Demo
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" className="max-h-[90dvh] w-72 overflow-y-auto rounded-2xl p-3">
        <p className="mb-2 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Theme</p>
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {(
            [
              ['light', Sun, 'Light'],
              ['dark', Moon, 'Dark'],
              ['system', Monitor, 'System'],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-bold',
                theme === id ? 'border-primary bg-secondary text-secondary-foreground' : 'hover:bg-muted',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Palette</p>
        <div className="mb-3 flex flex-col gap-1">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold',
                palette === p.id ? 'bg-secondary' : 'hover:bg-muted',
              )}
            >
              <span className="size-4 rounded-full" style={{ background: p.swatch }} />
              {p.label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Pages</p>
        <div className="flex flex-wrap gap-1">
          {PAGES.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold hover:bg-secondary hover:text-secondary-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
