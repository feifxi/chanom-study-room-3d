'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';

/** Lighting for the library at a given time of day. */
export interface DayLight {
  /** 0 = night, 1 = full day */
  dayness: number;
  hemiIntensity: number;
  hemiSky: string;
  sunIntensity: number;
  sunColor: string;
  sunPosition: [number, number, number];
  windowColor: string;
  /** 0 = lamps off, 1 = fully on */
  lamps: number;
  background: [string, string];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

/** Sunrise ≈ 6:00, sunset ≈ 18:30, with a warm golden hour either side. */
export function lightAt(hour: number): DayLight {
  const dayness = smooth(5.2, 7, hour) * (1 - smooth(17.6, 19.4, hour));
  // Golden hour peaks around sunrise and sunset
  const golden = Math.max(1 - Math.abs(hour - 6.4) / 1.2, 1 - Math.abs(hour - 18.3) / 1.2, 0);
  // Sun swings east → west across the day
  const arc = ((hour - 6) / 12.5) * Math.PI;
  const sunPosition: [number, number, number] = [Math.cos(arc) * -14, 6 + Math.max(0, Math.sin(arc)) * 14, 8];

  const daySun = mix('#fff1dc', '#ffb16b', golden);
  return {
    dayness,
    hemiIntensity: 0.8 + dayness * 0.7,
    hemiSky: mix('#7f8fc8', '#ffffff', dayness),
    sunIntensity: 0.35 + dayness * 1.75,
    sunColor: mix('#9fb3ff', daySun, dayness),
    sunPosition: dayness > 0.05 ? sunPosition : [8, 16, 10],
    windowColor: mix(mix('#1c2747', '#ffc38c', golden), '#bfe0ff', Math.max(0, dayness - golden * 0.6)),
    lamps: 1 - smooth(0.25, 0.75, dayness),
    background: [mix('#1d2238', '#f6efe4', dayness), mix('#2b3150', '#e4ebf5', dayness)],
  };
}

/** How the room is lit: follow the clock, or pin it to day or night. */
export const THEME_MODES = ['auto', 'day', 'night'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Representative hours for the pinned modes. */
const PINNED_HOUR: Record<Exclude<ThemeMode, 'auto'>, number> = { day: 13, night: 22 };
const THEME_KEY = 'chanom-study:theme';

function loadThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return (THEME_MODES as readonly string[]).includes(saved ?? '') ? (saved as ThemeMode) : 'auto';
  } catch {
    return 'auto';
  }
}

/** The viewer's chosen lighting mode, remembered in this browser. The room page is client-only, so localStorage is safe here. */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(loadThemeMode);
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // Private mode or blocked storage: the choice just won't be remembered
    }
  }, [mode]);
  return [mode, setMode] as const;
}

/** Current local time as fractional hours, overridable with ?hour=21 for testing. */
function currentHour() {
  const forced = Number(new URLSearchParams(window.location.search).get('hour'));
  if (Number.isFinite(forced) && forced >= 0 && forced < 24 && window.location.search.includes('hour=')) return forced;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

/** Lighting for the chosen mode; 'auto' follows the local clock and updates every 30 s. */
export function useDayLight(mode: ThemeMode): DayLight {
  const [autoLight, setAutoLight] = useState(() => lightAt(currentHour()));
  useEffect(() => {
    if (mode !== 'auto') return;
    const id = setInterval(() => setAutoLight(lightAt(currentHour())), 30_000);
    return () => clearInterval(id);
  }, [mode]);
  return mode === 'auto' ? autoLight : lightAt(PINNED_HOUR[mode]);
}
