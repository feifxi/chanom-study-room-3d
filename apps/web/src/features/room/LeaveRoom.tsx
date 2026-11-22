'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Leaving a room by accident is costly (voice drops, your focus timer stops, you lose your seat), so
 * the rule is: nothing inside a room navigates away silently. The Leave button leaves (that's its
 * job); every other way out goes through `useLeaveRoom().ask(href)` or `<LeaveRoomLink>`, which
 * asks first, and so does Back. Closing or reloading the tab gets the browser's own "Leave site?" prompt.
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
  fallback,
  children,
}: {
  roomName: string;
  /** Where Back goes once you say Leave (Home; guests have none) */
  fallback: string;
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

  // Back (the browser's, a phone's swipe) asks too: a copy of this page sits on top of the history,
  // so Back lands on the copy, puts it back and asks. Next's own state is kept on the copy.
  useEffect(() => {
    window.history.pushState({ ...window.history.state, leaveGuard: true }, '');
    const onPop = () => {
      window.history.pushState({ ...window.history.state, leaveGuard: true }, '');
      setTarget(fallback);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [fallback]);

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

/** A link for something shown both inside a room and outside (a DM card): asks first only inside one. */
export function OutLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const ask = useContext(LeaveContext);
  if (!ask) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        ask(href);
      }}
    >
      {children}
    </a>
  );
}
