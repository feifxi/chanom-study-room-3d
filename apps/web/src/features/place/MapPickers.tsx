'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAP_SIZES, type MapSize, type MapTemplate } from '@/lib/mock';
import { Scene } from './Scene';

/** A template to pick: its picture, mood and the zones you'd tell a friend about. */
export function TemplateCard({ map, picked, onPick }: { map: MapTemplate; picked: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={cn('rounded-2xl border-2 p-2 text-left', picked ? 'border-primary' : 'border-border hover:border-primary/40')}
    >
      <span className="relative isolate block aspect-video overflow-hidden rounded-xl">
        <Scene roomId={`template:${map.id}`} mapId={map.id} emojiClass="right-3 bottom-2 text-4xl" />
      </span>
      <span className="mt-1.5 block text-sm font-extrabold">
        {map.emoji} {map.name}
      </span>
      <span className="block text-[11px] font-bold text-primary">{map.mood}</span>
      <span className="block text-[11px] text-muted-foreground">{map.blurb}</span>
    </button>
  );
}

/** Cosy (up to 50) for everyone; Big (up to 100) when the room's owner has Plus. */
export function SizePicker({ size, plus, onPick }: { size: MapSize; plus: boolean; onPick: (s: MapSize) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MAP_SIZES.map((s) => {
        const locked = s.plusOnly && !plus;
        return (
          <button
            key={s.id}
            type="button"
            disabled={locked}
            onClick={() => onPick(s.id)}
            aria-pressed={size === s.id}
            className={cn(
              'rounded-2xl border-2 p-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60',
              size === s.id ? 'border-primary bg-secondary/40' : 'border-border',
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-extrabold">
              {s.name}
              {locked && (
                <span className="flex items-center gap-1 rounded-full bg-lavender px-2 py-0.5 text-[10px] font-black text-lavender-ink">
                  <Lock className="size-3" /> Plus
                </span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground">{s.text}</span>
          </button>
        );
      })}
    </div>
  );
}
