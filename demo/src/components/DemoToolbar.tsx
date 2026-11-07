'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { VARIANTS, setVariant, useVariant, type VariantKind } from '@/lib/variants';
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
  ['Public room', '/servers/public/rooms/cafe-lounge-1'],
  ['Invite (guest)', '/invite/cafe-chanom'],
] as const;

const VARIANT_TITLES: Record<VariantKind, string> = { home: 'Home design', server: 'Server page design', room: 'Room layout' };

/** Demo-only chrome: theme, palette, design variants, and a jump to any page. Not part of the app design. */
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

        {(Object.keys(VARIANTS) as VariantKind[]).map((kind) => (
          <VariantPicker key={kind} kind={kind} />
        ))}

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

function VariantPicker({ kind }: { kind: VariantKind }) {
  const current = useVariant(kind);
  return (
    <div className="mb-3">
      <Title>{VARIANT_TITLES[kind]}</Title>
      <div className="flex flex-col gap-1">
        {VARIANTS[kind].map(([id, label, hint]) => (
          <button
            key={id}
            onClick={() => setVariant(kind, id as never)}
            className={cn('rounded-xl border px-2.5 py-1.5 text-left', current === id ? 'border-primary bg-secondary' : 'hover:bg-muted')}
          >
            <span className="block text-sm font-extrabold">{label}</span>
            <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">{children}</p>;
}
