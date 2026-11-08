'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuests } from '@/lib/quests';

/** Today's three quests with progress; the same list in the Shop and in 3D (My tools → 🎯). */
export function QuestList({ className }: { className?: string }) {
  const { quests } = useQuests();
  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {quests.map((q) => {
        const done = q.progress >= q.goal;
        return (
          <li key={q.id} className={cn('rounded-2xl p-2.5', done ? 'bg-mint text-mint-ink' : 'bg-muted/60')}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">{q.emoji}</span>
              <span className="min-w-0 flex-1 font-bold">{q.title}</span>
              <span className="flex flex-none items-center gap-0.5 text-xs font-black">
                {done ? <Check className="size-3.5" /> : '+'}
                {q.coins} 🪙
              </span>
            </div>
            {!done && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(q.progress / q.goal) * 100}%` }} />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {q.progress} / {q.goal}
                  {q.unit && ` ${q.unit}`}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
