'use client';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACTIVITIES = [
  {
    id: 'tv',
    emoji: '📺',
    name: 'TV · Watch together',
    where: 'Big TV by the window',
    status: 'Nobody watching',
    tint: 'bg-sky',
    action: 'Show me',
  },
  {
    id: 'jukebox',
    emoji: '📻',
    name: 'Jukebox',
    where: 'Reading nook',
    status: '“Sunny Café” queued by Ploy',
    tint: 'bg-peach',
    action: 'Show me',
  },
  {
    id: 'cards',
    emoji: '🃏',
    name: 'Card table',
    where: 'Back corner',
    status: 'Slave · Ken is waiting for 2 more',
    tint: 'bg-mint',
    action: 'Show me',
  },
  { id: 'board', emoji: '🎨', name: 'Whiteboard', where: 'Left wall', status: 'Free', tint: 'bg-lavender', action: 'Show me' },
  {
    id: 'pick',
    emoji: '🗳️',
    name: 'Pick a Side',
    where: 'Whole room',
    status: 'Ask the room a question',
    tint: 'bg-secondary',
    action: 'Start',
  },
  {
    id: 'quiz',
    emoji: '🧠',
    name: 'AI quiz',
    where: 'Whole room',
    status: 'Paste notes, get questions',
    tint: 'bg-muted',
    action: 'Start',
  },
];

/**
 * What you can do in this room. Activities live at spots in the map (a TV, a table, a board), so
 * "Show me" points you there; room-wide ones send everyone an invite they can ignore.
 */
export function ActivitiesPanel({ quiet, onClose }: { quiet: boolean; onClose: () => void }) {
  return (
    <div className="panel flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 p-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="flex-1 text-sm font-black">Things to do here</h2>
        <span className="rounded-full bg-peach px-2 py-0.5 text-[10px] font-black text-peach-ink">PREVIEW</span>
      </div>
      {quiet && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          This is a quiet room: room-wide games are off. Table games still work.
        </p>
      )}
      {ACTIVITIES.map((a) => {
        const off = quiet && a.where === 'Whole room';
        return (
          <div key={a.id} className={cn('flex items-center gap-3 rounded-2xl border bg-card/70 p-2', off && 'opacity-45')}>
            <span className={cn('grid size-10 place-items-center rounded-xl text-xl', a.tint)}>{a.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{a.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {a.where} · {a.status}
              </span>
            </span>
            <button
              disabled={off}
              onClick={() => {
                toast(
                  a.action === 'Start'
                    ? `Invite sent: “Join ${a.name}?” People can say no and keep studying.`
                    : `Follow the arrow to the ${a.name.split(' ·')[0]}`,
                );
                onClose();
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold',
                a.action === 'Start' ? 'bg-primary text-primary-foreground' : 'border bg-card hover:bg-muted',
              )}
            >
              {a.action}
            </button>
          </div>
        );
      })}
    </div>
  );
}
