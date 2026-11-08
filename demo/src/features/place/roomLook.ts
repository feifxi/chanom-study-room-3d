'use client';

import { useSyncExternalStore } from 'react';
import { MAPS, type MapSize, type MapTemplate } from '@/lib/mock';

/**
 * How the owner has set up the room (feature 7): template, size, the time of day and a thumbnail. One look per room, the same for everyone inside: the time
 * of day is the owner's choice, not each viewer's, so everyone sits in the same evening.
 *
 * The demo keeps it in sessionStorage and broadcasts changes with an event, so the 3D room updates
 * while the settings dialog is open. The real app stores it on the room and pushes it over the
 * gateway.
 */
export type RoomTime = 'clock' | 'day' | 'night';

export interface RoomLook {
  mapId: string;
  size: MapSize;
  time: RoomTime;
  /** A 16:9 data URL (downscaled), or none to use the map's picture. */
  thumb?: string;
}

export const ROOM_TIMES: { id: RoomTime; label: string; text: string }[] = [
  { id: 'clock', label: 'Follow the clock', text: 'Day and night follow the room’s time zone' },
  { id: 'day', label: 'Always day', text: 'Sunny afternoon, all the time' },
  { id: 'night', label: 'Always night', text: 'Lamps on, stars out' },
];

const EVENT = 'connecta:room-look';
const key = (roomId: string) => `connecta:look:${roomId}`;
const cache = new Map<string, { raw: string | null; look: RoomLook }>();
const defaults = new Map<string, RoomLook>();

/** The same default object each time: useSyncExternalStore loops on a fresh object per call. */
function cachedDefault(mapId: string) {
  if (!defaults.has(mapId)) defaults.set(mapId, defaultLook(mapId));
  return defaults.get(mapId)!;
}

export function defaultLook(mapId: string): RoomLook {
  return { mapId, size: 'cosy', time: 'clock' };
}

export const mapById = (id: string): MapTemplate => MAPS.find((m) => m.id === id) ?? MAPS[0]!;

function read(roomId: string, mapId: string): RoomLook {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key(roomId));
  } catch {
    // Blocked storage: everyone just sees the defaults
  }
  // useSyncExternalStore needs the same object back while nothing changed
  const hit = cache.get(roomId + mapId);
  if (hit && hit.raw === raw) return hit.look;
  const look = raw ? { ...defaultLook(mapId), ...(JSON.parse(raw) as Partial<RoomLook>) } : cachedDefault(mapId);
  cache.set(roomId + mapId, { raw, look });
  return look;
}

export function saveLook(roomId: string, look: RoomLook) {
  try {
    sessionStorage.setItem(key(roomId), JSON.stringify(look));
  } catch {
    // Too big (a huge thumbnail) or blocked: keep the old look
    return false;
  }
  window.dispatchEvent(new Event(EVENT));
  return true;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** The room's current look; `mapId` is the map the room was made with (the mock's default). */
export function useRoomLook(roomId: string, mapId: string): RoomLook {
  return useSyncExternalStore(
    subscribe,
    () => read(roomId, mapId),
    () => cachedDefault(mapId),
  );
}

/** Crops a picked image to 16:9 and shrinks it to 640×360, so it fits in storage and loads fast. */
export function toThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = 640;
      const h = 360;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const scale = Math.max(w / img.width, h / img.height);
      const sw = w / scale;
      const sh = h / scale;
      canvas.getContext('2d')!.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Not a picture'));
    };
    img.src = url;
  });
}
