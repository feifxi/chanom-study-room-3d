'use client';

import { useState, type ReactNode } from 'react';
import { CircleHelp, ListTodo, Trophy, type LucideIcon } from 'lucide-react';

export interface RailItem {
  id: string;
  icon: LucideIcon;
  label: string;
  /** Kept mounted while closed (e.g. so a half-typed to-do survives). */
  keepMounted?: boolean;
  render: () => ReactNode;
}

/** Left icon rail (Connecta-style). One panel opens beside it at a time. */
export function IconRail({ items, compact = false }: { items: RailItem[]; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className={`absolute flex items-start ${compact ? 'top-[64px] right-2 left-2 flex-col gap-2' : 'top-[88px] left-4 gap-3'}`}>
      <nav aria-label="Room tools" className={`panel flex gap-1 p-1.5 ${compact ? 'flex-row' : 'flex-col'}`}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setOpen(open === it.id ? null : it.id)}
            aria-pressed={open === it.id}
            aria-label={it.label}
            title={it.label}
            className={`grid place-items-center rounded-xl ${compact ? 'size-10' : 'size-11'} ${open === it.id ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-soft hover:text-ink'}`}
          >
            <it.icon className="size-5" />
          </button>
        ))}
      </nav>
      {items.map((it) =>
        it.keepMounted || open === it.id ? (
          <div
            key={it.id}
            className={`${compact ? 'max-h-[calc(100dvh-200px)] w-[min(18rem,100%)] overflow-y-auto rounded-[22px]' : 'w-72'} ${open === it.id ? '' : 'hidden'}`}
          >
            {it.render()}
          </div>
        ) : null,
      )}
    </div>
  );
}

export const RAIL_ICONS = { todo: ListTodo, ranks: Trophy, help: CircleHelp };
