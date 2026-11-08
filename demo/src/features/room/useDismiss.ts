'use client';

import { useEffect, useRef, type RefObject } from 'react';

// Which press closed a panel. A click outside a panel only closes it, like menus everywhere: the 3D
// room asks `pressClosedPanel()` so that same click doesn't also walk you somewhere.
let presses = 0;
let closingPress = -1;
if (typeof window !== 'undefined') {
  // Window capture runs before the document listeners below, so the count is current when they run
  window.addEventListener('pointerdown', () => presses++, true);
}

/** True while handling the click whose press just closed a HUD panel. */
export const pressClosedPanel = () => closingPress === presses;

/**
 * Closes an open HUD panel when you press anywhere else on the screen (the room, another panel) or
 * hit Escape, so panels never pile up over the room. Presses inside a menu or dialog opened from the
 * panel don't count: those live in portals outside the panel, and closing the panel under them
 * would lose what you were doing.
 */
export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void): RefObject<T | null> {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const overlayOpen = () => !!document.querySelector('[role="menu"], [role="dialog"], [role="alertdialog"]');
    const onDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node) || overlayOpen()) return;
      closingPress = presses;
      close.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !overlayOpen()) close.current();
    };
    // Capture phase: the 3D canvas handles its own pointer events and may stop them bubbling
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return ref;
}
