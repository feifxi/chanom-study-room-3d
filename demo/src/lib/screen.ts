'use client';

import { useSyncExternalStore } from 'react';

/** Phones and tablets: the main pointer is a finger. */
const TOUCH = '(pointer: coarse)';
/** Small screens, either way up (a phone in portrait, or in landscape where height is the limit). */
const COMPACT = '(max-width: 767px), (max-height: 500px)';

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Touch screen: show the joystick and tap labels instead of key hints. */
export const useTouchScreen = () => useMediaQuery(TOUCH);
/** Small screen: the HUD switches to its phone layout. Follows rotation and resizing. */
export const useCompactScreen = () => useMediaQuery(COMPACT);

/** One-off checks, for initial state. */
export const isTouchScreen = () => typeof window !== 'undefined' && window.matchMedia(TOUCH).matches;
export const isCompactScreen = () => typeof window !== 'undefined' && window.matchMedia(COMPACT).matches;

/** Mobile browsers (and iPad Safari) can't share a screen. */
export const canShareScreen = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
