'use client';

import { useState, type ReactNode } from 'react';
import { BookOpenText, CircleHelp, Music2, Target, X, type LucideIcon } from 'lucide-react';
import { QuestList } from '@/components/app/QuestList';
import { useQuests } from '@/lib/quests';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { KEYS } from '@/lib/controls';
import { MusicPanel } from '../music/MusicPanel';
import { TRACKS } from '../music/tracks';
import type { Music } from '../music/useMusic';
import { useDismiss } from './useDismiss';
import { formatLeft, type usePomodoro } from './usePomodoro';

type ToolId = 'study' | 'music' | 'quests' | 'help';

/**
 * My tools, the left rail (V1's icon rail): your own things that don't affect anyone else, one
 * panel open beside it at a time. The study panel stays mounted while closed so a half-typed to-do
 * survives. Like every HUD panel, it closes when you press anywhere else.
 */
export function RoomTools({
  study,
  pomo,
  music,
  touch,
  className,
}: {
  study: ReactNode;
  pomo: ReturnType<typeof usePomodoro>;
  music: Music;
  touch: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<ToolId | null>(null);
  const ref = useDismiss<HTMLDivElement>(!!open, () => setOpen(null));
  const { quests, coins } = useQuests();
  const done = quests.filter((q) => q.progress >= q.goal).length;

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
    {
      id: 'quests',
      icon: Target,
      label: `Today’s quests: ${done} of ${quests.length} done`,
      badge: <span className="font-mono text-[9px] leading-none font-black text-primary">{`${done}/${quests.length}`}</span>,
    },
    { id: 'help', icon: CircleHelp, label: 'How to play' },
  ];

  return (
    <div ref={ref} className={cn('flex items-start gap-2', className)}>
      <nav aria-label="Room tools" className="panel flex flex-col gap-1 p-1.5">
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
            <TooltipContent side="right">{t.label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>

      <div className="w-[min(300px,calc(100vw-5.5rem))]">
        <div className={cn(open !== 'study' && 'hidden')}>{study}</div>
        {open === 'music' && (
          <ToolCard title="Music" note="Only you hear it" onClose={() => setOpen(null)}>
            <MusicPanel music={music} />
          </ToolCard>
        )}
        {open === 'quests' && (
          <ToolCard title="Today’s quests" note={`🪙 ${coins.toLocaleString()}`} onClose={() => setOpen(null)}>
            <QuestList />
            <p className="text-[11px] text-muted-foreground">New ones at midnight. Coins buy outfits and pets in the Shop.</p>
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

const TOUCH: [string, string][] = [
  ['Joystick', 'Walk'],
  ['Tap the floor', 'Walk there'],
  ['Button', 'Sit, stand up, pet, open the machine'],
  ['Drag / pinch', 'Turn the camera / zoom'],
];
