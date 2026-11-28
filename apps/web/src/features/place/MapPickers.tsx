'use client';

import { cn } from '@/lib/utils';
import type { MapTemplate } from '@/lib/maps';
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
        <Scene mapId={map.id} emojiClass="right-3 bottom-2 text-4xl" />
      </span>
      <span className="mt-1.5 block text-sm font-extrabold">
        {map.emoji} {map.name}
      </span>
      <span className="block text-[11px] font-bold text-primary">{map.mood}</span>
      <span className="block text-[11px] text-muted-foreground">{map.blurb}</span>
    </button>
  );
}
