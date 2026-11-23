'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import type { GameRoom } from '@/features/game/useGame';

/**
 * The Connecta team's notice in a Common room (admin site): a banner at the top for everyone inside,
 * e.g. maintenance or an event, until it runs out. Each person can close it for themselves.
 */
export function CommonNoticeBanner({ game }: { game: GameRoom }) {
  const [notice, setNotice] = useState<{ text: string; until: number } | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      const text = game.state?.notice ?? '';
      const until = game.state?.noticeUntil ?? 0;
      setNotice((was) => (!text ? null : was?.text === text && was.until === until ? was : { text, until }));
    };
    read();
    game.onStateChange(read);
    return () => game.onStateChange.remove(read);
  }, [game]);
  // Hide it on time
  useEffect(() => {
    if (!notice) return;
    // Already past: the timer fires at once
    const t = setTimeout(() => setNotice(null), Math.max(0, notice.until - Date.now()));
    return () => clearTimeout(t);
  }, [notice]);

  const key = notice && `${notice.text}@${notice.until}`;
  if (!notice || closed === key) return null;
  return (
    <div className="pointer-events-auto absolute top-16 left-1/2 z-20 flex w-[min(92vw,30rem)] -translate-x-1/2 items-center gap-2.5 rounded-2xl bg-primary px-3.5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft">
      <Megaphone className="size-4 flex-none" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black tracking-wider uppercase opacity-80">From the Connecta team</span>
        {notice.text}
      </span>
      <button onClick={() => setClosed(key)} aria-label="Close" className="rounded-full p-1 hover:bg-white/15">
        <X className="size-4" />
      </button>
    </div>
  );
}
