'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Leaving a room by accident is costly (voice drops, your focus timer stops, you lose your seat), so
 * the rule is: nothing inside a room navigates away silently. The Leave button leaves (that's its
 * job); every other way out goes through `useLeaveRoom().ask(href)` or `<LeaveRoomLink>`, which
 * asks first. Closing or reloading the tab gets the browser's own "Leave site?" prompt.
 */
const LeaveContext = createContext<((href: string) => void) | null>(null);

export function useLeaveRoom() {
  const ask = useContext(LeaveContext);
  if (!ask) throw new Error('useLeaveRoom must be used inside <LeaveRoomGuard>');
  return { ask };
}

export function LeaveRoomGuard({
  roomName,
  focusing,
  onLeave,
  children,
}: {
  roomName: string;
  /** Mention the timer only when there's one to lose. */
  focusing: boolean;
  /** Leaves for real (disconnect, stop music) and goes to `href`. */
  onLeave: (href: string) => void;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return (
    <LeaveContext.Provider value={setTarget}>
      {children}
      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black">Leave {roomName}?</DialogTitle>
            <DialogDescription>
              You’ll stop hearing people nearby and lose your seat
              {focusing ? ', and your focus timer stops (the minutes so far still count)' : ''}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {/* Staying is the safe choice, so it gets the focus */}
            <Button autoFocus className="rounded-full font-extrabold" onClick={() => setTarget(null)}>
              Stay
            </Button>
            <Button
              variant="outline"
              className="rounded-full font-extrabold"
              onClick={() => {
                const href = target!;
                setTarget(null);
                onLeave(href);
              }}
            >
              Leave room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LeaveContext.Provider>
  );
}

/** A link out of the room that asks first. Use it instead of `<Link>` anywhere in the room HUD. */
export function LeaveRoomLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { ask } = useLeaveRoom();
  return (
    <a
      href={href}
      className={cn(className)}
      onClick={(e) => {
        e.preventDefault();
        ask(href);
      }}
    >
      {children}
    </a>
  );
}
