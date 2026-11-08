'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CROWDS, goAwayNow, setCrowd, setManyRooms, useCrowd, useManyRooms } from '@/lib/demoCrowd';
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
  ['Room chat (outside 3D)', '/servers/chanom'],
  ['3D room', '/servers/chanom/rooms/library'],
  ['Public room', '/servers/public/rooms/cafe-lounge-1'],
  ['Invite (guest)', '/invite/cafe-chanom'],
] as const;

/** Demo-only chrome: theme, palette, a crowd for the 3D room, 100 rooms on Home, and a jump to any page. Not part of the app design. */
export function DemoToolbar() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const crowd = useCrowd();
  const many = useManyRooms();
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
      <PopoverContent side="left" className="max-h-[92dvh] w-80 overflow-y-auto rounded-2xl p-3">
        <Title>Theme</Title>
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

        <Title>Palette · {PALETTES.find((p) => p.id === palette)?.label}</Title>
        <div className="mb-3 grid grid-cols-5 gap-1.5">
          {PALETTES.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setPalette(p.id)}
                  aria-label={p.label}
                  aria-pressed={palette === p.id}
                  className={cn(
                    'grid h-9 place-items-center rounded-xl border-2',
                    palette === p.id ? 'border-foreground' : 'border-transparent hover:border-border',
                  )}
                >
                  <span className="size-5 rounded-full shadow-sm" style={{ background: p.swatch }} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{p.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Title>Crowd in the 3D room</Title>
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {CROWDS.map((n) => (
            <button
              key={n}
              onClick={() => setCrowd(n)}
              aria-pressed={crowd === n}
              className={cn(
                'rounded-xl border p-2 text-xs font-bold',
                crowd === n ? 'border-primary bg-secondary text-secondary-foreground' : 'hover:bg-muted',
              )}
            >
              {n ? `${n} people` : 'Just us'}
            </button>
          ))}
        </div>

        <button onClick={goAwayNow} className="mb-3 w-full rounded-xl border p-2 text-xs font-bold hover:bg-muted">
          💤 Go away now (in a 3D room; skips the 10 minutes)
        </button>

        <Title>Your rooms on Home</Title>
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {([false, true] as const).map((on) => (
            <button
              key={String(on)}
              onClick={() => setManyRooms(on)}
              aria-pressed={many === on}
              className={cn(
                'rounded-xl border p-2 text-xs font-bold',
                many === on ? 'border-primary bg-secondary text-secondary-foreground' : 'hover:bg-muted',
              )}
            >
              {on ? '100 rooms' : '11 rooms'}
            </button>
          ))}
        </div>

        <Title>Pages</Title>
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

function Title({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">{children}</p>;
}
