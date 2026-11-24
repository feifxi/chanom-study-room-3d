'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, Wrench } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CROWDS, goAwayNow, setCrowd, useCrowd } from '@/lib/testCrowd';
import { cn } from '@/lib/utils';
import { setPerfOverlay, usePerfOverlay } from '@/features/room3d/perf';
import { setPlusState, usePlus, type PlusState } from '@/lib/plus';

/**
 * Shortcuts for testing by hand, in development only (the root layout never renders it in production):
 * the theme, a pretend crowd and the perf meter for the 3D room, going Away without waiting, and your
 * Plus state (the API's dev-only switch). Not part of the app's design. The manual tests use it.
 */
export function TestTools() {
  const { theme, setTheme } = useTheme();
  const crowd = useCrowd();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          // A tab on the right edge, mid-height: clear of every page's header, dock and composer
          className="fixed top-1/2 right-0 z-[60] flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-dashed border-primary/60 bg-card/90 px-1 py-2 text-[10px] font-extrabold text-muted-foreground shadow-soft backdrop-blur [writing-mode:vertical-rl] hover:text-foreground"
          aria-label="Test tools"
        >
          <Wrench className="size-3.5" /> Test
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" className="max-h-[92dvh] w-80 overflow-y-auto rounded-2xl p-3">
        <p className="mb-3 text-[11px] text-muted-foreground">Development only. These change things in your browser or your own account.</p>
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

        <Title>Pretend crowd in 3D rooms (your screen only)</Title>
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

        <PerfToggle />
        <button onClick={goAwayNow} className="mb-3 w-full rounded-xl border p-2 text-xs font-bold hover:bg-muted">
          💤 Go away now (in a 3D room; skips the 10 minutes)
        </button>

        <PlusSwitch />
      </PopoverContent>
    </Popover>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">{children}</p>;
}

/** The room's performance overlay: fps, frame time, draw calls and triangles against the budget. */
function PerfToggle() {
  const on = usePerfOverlay();
  return (
    <button
      onClick={() => setPerfOverlay(!on)}
      aria-pressed={on}
      className={cn('mb-3 w-full rounded-xl border p-2 text-xs font-bold', on ? 'border-primary bg-secondary' : 'hover:bg-muted')}
    >
      📈 Performance overlay {on ? 'on' : 'off'}
    </button>
  );
}

const PLUS_STATES: [PlusState, string][] = [
  ['active', 'Plus'],
  ['cancelled', 'Cancelled'],
  ['grace', 'Ended · grace'],
  ['free', 'Free'],
];

/** Your Plus state (docs/features/15-plus.md): see the ending banner, grace and the Free Plus page without waiting. */
function PlusSwitch() {
  const plus = usePlus();
  return (
    <>
      <Title>Your Plus</Title>
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {PLUS_STATES.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPlusState(id)}
            aria-pressed={plus.state === id}
            className={cn(
              'rounded-xl border p-2 text-xs font-bold',
              plus.state === id ? 'border-primary bg-secondary text-secondary-foreground' : 'hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
