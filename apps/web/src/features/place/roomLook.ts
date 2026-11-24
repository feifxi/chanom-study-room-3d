'use client';

import { MAPS, type MapSize, type MapTemplate } from '@/lib/maps';

/**
 * How the owner has set up the room (docs/features/06-maps.md): template, size and the time of day. One look per room, the same for everyone inside: the time
 * of day is the owner's choice, not each viewer's, so everyone sits in the same evening. (The thumbnail is on the room itself, from the API.)
 * It's stored on the room (the API); a map change reaches people inside through the game server.
 */
export type RoomTime = 'clock' | 'day' | 'night';

export interface RoomLook {
  mapId: string;
  size: MapSize;
  time: RoomTime;
}

export const ROOM_TIMES: { id: RoomTime; label: string; text: string }[] = [
  { id: 'clock', label: 'Follow the clock', text: 'Day and night follow the room’s time zone' },
  { id: 'day', label: 'Always day', text: 'Sunny afternoon, all the time' },
  { id: 'night', label: 'Always night', text: 'Lamps on, stars out' },
];

export const mapById = (id: string): MapTemplate => MAPS.find((m) => m.id === id) ?? MAPS[0]!;

/** Crops a picked image to 16:9 and shrinks it to 1280×720, so the upload is small (the API makes the final WebP). */
export function toThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = 1280;
      const h = 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const scale = Math.max(w / img.width, h / img.height);
      const sw = w / scale;
      const sh = h / scale;
      canvas.getContext('2d')!.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Not a picture'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Not a picture'));
    };
    img.src = url;
  });
}
