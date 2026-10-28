'use client';

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerView } from '@study/shared';
import type { Bubble } from './useStudyRoom';
import { STATUS_ICON, useTick } from '../focus/FocusPanel';

/**
 * Name tags, speech bubbles and typing dots live in one plain DOM layer over the
 * canvas (instead of a drei <Html> root per avatar, which is heavier and can
 * throw on unmount). Avatars publish a head-top anchor; the projector moves
 * each label to that anchor's screen position every frame.
 */
export class LabelBoard {
  readonly anchors = new Map<string, THREE.Vector3>();
  readonly labels = new Map<string, HTMLDivElement>();
  readonly dots = new Map<string, HTMLDivElement>();
}

const v = new THREE.Vector3();

/** Runs after every other frame callback (priority 1), then renders the scene itself. */
export function LabelProjector({ board }: { board: LabelBoard }) {
  useFrame(({ gl, scene, camera, size }) => {
    gl.render(scene, camera);
    for (const [id, el] of board.labels) {
      const anchor = board.anchors.get(id);
      if (!anchor) {
        el.style.visibility = 'hidden';
        continue;
      }
      v.copy(anchor).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.visibility = v.z > 1 ? 'hidden' : 'visible';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }, 1);
  return null;
}

interface LayerProps {
  board: LabelBoard;
  ids: string[];
  players: Map<string, PlayerView>;
  localId: string;
  bubbles: Record<string, Bubble>;
  voice: { speaking: Set<string>; micEnabled: Set<string>; sharing: Set<string> };
}

export function LabelLayer({ board, ids, players, localId, bubbles, voice }: LayerProps) {
  useTick(1000); // status/subject come from synced state, which React doesn't watch
  const now = Date.now();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {ids.map((id) => {
        const player = players.get(id);
        if (!player) return null;
        const isLocal = id === localId;
        const bubble = bubbles[id];
        const talking = !!bubble && bubble.until > now;
        return (
          <div
            key={id}
            ref={(el) => {
              if (el) board.labels.set(id, el);
              else board.labels.delete(id);
            }}
            className="absolute top-0 left-0 flex flex-col items-center gap-1.5"
            style={{ visibility: 'hidden' }}
          >
            {/* Typing dots are toggled per frame from synced state; a fresh bubble replaces them */}
            <div
              ref={(el) => {
                if (el) board.dots.set(id, el);
                else board.dots.delete(id);
              }}
              className="typing-dots"
              style={{ display: 'none' }}
              aria-label="กำลังพิมพ์"
            >
              <span />
              <span />
              <span />
            </div>
            {talking && (
              <div className="w-max max-w-56 rounded-xl bg-white px-2.5 py-1.5 text-center text-xs leading-snug font-semibold text-ink shadow-md">
                {bubble.text}
              </div>
            )}
            <div
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap shadow-sm ${
                isLocal ? 'bg-accent text-white' : 'bg-white/90 text-ink'
              } ${voice.speaking.has(id) ? 'speaking' : ''}`}
            >
              {/* Mic: bright while speaking, faded when on but quiet */}
              {voice.micEnabled.has(id) && <span className={`mr-1 ${voice.speaking.has(id) ? '' : 'opacity-50'}`}>🎙️</span>}
              {voice.sharing.has(id) && <span className="mr-1">🖥️</span>}
              {STATUS_ICON[player.status] && <span className="mr-1">{STATUS_ICON[player.status]}</span>}
              {player.name}
              {isLocal && ' (คุณ)'}
              {player.status === 'focus' && player.subject && <span className="ml-1 font-semibold opacity-75">· {player.subject}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
