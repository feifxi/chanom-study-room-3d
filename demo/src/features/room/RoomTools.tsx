'use client';

import { useState, type ReactNode } from 'react';
import { BookOpenText, CircleHelp, Music2, X, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MusicPanel } from '../music/MusicPanel';
import { TRACKS } from '../music/tracks';
import type { Music } from '../music/useMusic';
import { formatLeft, type usePomodoro } from './usePomodoro';

type ToolId = 'study' | 'music' | 'help';

/**
 * V1's left icon rail, back by request: one button per personal tool, one panel open beside it at a
 * time. The study panel stays mounted while closed so a half-typed to-do survives.
 */
export function RoomTools({
  study,
  pomo,
  music,
  touch,
  direction = 'right',
  className,
}: {
  study: ReactNode;
  pomo: ReturnType<typeof usePomodoro>;
  music: Music;
  touch: boolean;
  /** Where panels open: beside a vertical rail (left side), or above a horizontal one (bottom bar). */
  direction?: 'right' | 'up';
  className?: string;
}) {
  const up = direction === 'up';
  const [open, setOpen] = useState<ToolId | null>(null);

  const tools: { id: ToolId; icon: LucideIcon; label: string; badge?: ReactNode }[] = [
    {
      id: 'study',
      icon: BookOpenText,
      label: 'Study session: focus timer, to-do and today’s focus',
      // While the timer runs, the button itself shows it, so the panel can stay closed
      badge: pomo.phase !== 'idle' && (
        <span className="font-mono text-[9px] leading-none font-black text-primary">{formatLeft(pomo.left)}</span>
      ),
    },
    {
      id: 'music',
      icon: Music2,
      label: music.playing ? `Music: ${TRACKS[music.index]!.title}` : 'Music',
      badge: music.playing && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-online" />,
    },
    { id: 'help', icon: CircleHelp, label: 'How to play' },
  ];

  return (
    <div className={cn('flex gap-2', up ? 'relative' : 'items-start', className)}>
      <nav aria-label="Room tools" className={cn('panel flex gap-1 p-1.5', up ? 'flex-row' : 'flex-col')}>
        {tools.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setOpen(open === t.id ? null : t.id)}
                aria-pressed={open === t.id}
                aria-label={t.label}
                className={cn(
                  'relative flex size-11 flex-col items-center justify-center gap-0.5 rounded-xl',
                  open === t.id ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <t.icon className="size-5" />
                {t.badge}
              </button>
            </TooltipTrigger>
            <TooltipContent side={up ? 'top' : 'right'}>{t.label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>

      <div className={cn('w-[min(300px,calc(100vw-5.5rem))]', up && 'absolute bottom-full left-0 mb-2')}>
        <div className={cn(open !== 'study' && 'hidden')}>{study}</div>
        {open === 'music' && (
          <ToolCard title="Music" note="Only you hear it" onClose={() => setOpen(null)}>
            <MusicPanel music={music} />
          </ToolCard>
        )}
        {open === 'help' && (
          <ToolCard title="How to play" onClose={() => setOpen(null)}>
            <HelpContent touch={touch} />
          </ToolCard>
        )}
      </div>
    </div>
  );
}

/** Controls for keyboard or touch, plus the two things people ask first (voice and screen share). */
export function HelpContent({ touch }: { touch: boolean }) {
  return (
    <>
      <dl className="flex flex-col gap-2 text-xs">
        {(touch ? TOUCH : KEYS).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <dt className="flex-none rounded-md border bg-muted px-1.5 py-0.5 font-mono font-bold">{k}</dt>
            <dd className="pt-0.5 text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Turn your mic on in the dock: the closer people stand, the louder they are. Sit at a table to share your screen with that table.
      </p>
    </>
  );
}

function ToolCard({ title, note, onClose, children }: { title: string; note?: string; onClose: () => void; children: ReactNode }) {
  return (
    <section className="panel flex flex-col gap-3 p-3" aria-label={title}>
      <div className="flex items-center gap-2 px-1">
        <h2 className="flex-1 text-sm font-black">{title}</h2>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
        <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label={`Close ${title}`}>
          <X className="size-4" />
        </button>
      </div>
      {children}
    </section>
  );
}

const KEYS: [string, string][] = [
  ['WASD / arrows', 'Walk (Shift to run)'],
  ['E', 'Sit or stand, pet a cat, use the Buddy Machine'],
  ['Enter', 'Chat'],
  ['Drag / scroll', 'Turn the camera / zoom'],
];

const TOUCH: [string, string][] = [
  ['Joystick', 'Walk'],
  ['Button', 'Sit, stand up, pet, open the machine'],
  ['Drag / pinch', 'Turn the camera / zoom'],
];
