'use client';

import { X } from 'lucide-react';
import { Composer } from '@/components/chat/Chat';
import { cn } from '@/lib/utils';

export interface RoomLine {
  id: string;
  name?: string;
  text: string;
  system?: boolean;
}

/**
 * Room chat, bottom left like V1: only this room, and what you type also pops over your head. Server
 * chats and DMs live in the room card at the top left instead.
 */
export function RoomChat({
  lines,
  onSend,
  onClose,
  className,
}: {
  lines: RoomLine[];
  onSend: (text: string) => void;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <section className={cn('panel flex flex-col gap-2 p-2', className)} aria-label="Room chat">
      <div className="flex items-center gap-2 px-1.5 pt-0.5">
        <h2 className="flex-1 text-sm font-black">Room chat</h2>
        <span className="text-[11px] text-muted-foreground">pops over heads</span>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="Hide chat">
            <X className="size-4" />
          </button>
        )}
      </div>

      <>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1">
          {lines.map((l) =>
            l.system ? (
              <p key={l.id} className="rounded-xl bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {l.text}
              </p>
            ) : (
              <p key={l.id} className="text-sm">
                <span className="font-black">{l.name}</span> {l.text}
              </p>
            ),
          )}
        </div>
        <Composer compact placeholder="Say something to the room" onSend={onSend} />
      </>
    </section>
  );
}
