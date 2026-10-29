'use client';

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { NpcView, PlayerView } from '@study/shared';
import { npcKey, type Bubble, type Reaction } from './roomSession';
import { minutesSince, useNow } from '@/lib/time';
import { STATUS_ICON } from '../focus/status';

const v = new THREE.Vector3();

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

  /** Move every label to its anchor's screen position. Called once per frame. */
  project(camera: THREE.Camera, width: number, height: number) {
    for (const [id, el] of this.labels) {
      const anchor = this.anchors.get(id);
      if (!anchor) {
        el.style.visibility = 'hidden';
        continue;
      }
      v.copy(anchor).project(camera);
      const x = ((v.x + 1) / 2) * width;
      const y = ((1 - v.y) / 2) * height;
      el.style.visibility = v.z > 1 ? 'hidden' : 'visible';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }
}

/** Runs after every other frame callback (priority 1), then renders the scene itself. */
export function LabelProjector({ board }: { board: LabelBoard }) {
  useFrame(({ gl, scene, camera, size }) => {
    gl.render(scene, camera);
    board.project(camera, size.width, size.height);
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
  clockOffset: number;
  npcIds: string[];
  npcs: Map<string, NpcView> | undefined;
  reactions: Reaction[];
}

function SpeechBubble({ bubble, now }: { bubble?: Bubble; now: number }) {
  if (!bubble || bubble.until <= now) return null;
  return (
    <div className="w-max max-w-56 rounded-xl bg-white px-2.5 py-1.5 text-center text-xs leading-snug font-semibold text-ink shadow-md">
      {bubble.text}
    </div>
  );
}

function Emotes({ target, reactions }: { target: string; reactions: Reaction[] }) {
  return (
    <>
      {reactions
        .filter((r) => r.target === target)
        .map((r) => (
          <span key={r.key} className="emote-float">
            {r.emote}
          </span>
        ))}
    </>
  );
}

export function LabelLayer({ board, ids, players, localId, bubbles, voice, clockOffset, npcIds, npcs, reactions }: LayerProps) {
  // Re-render every second: status/subject come from synced state, which React doesn't watch
  const now = useNow(1000);
  const serverNow = now + clockOffset;
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
              aria-label="Typing"
            >
              <span />
              <span />
              <span />
            </div>
            {talking && <SpeechBubble bubble={bubble} now={now} />}
            <div
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white shadow-sm ${
                isLocal ? 'bg-accent' : 'bg-navy/85'
              } ${voice.speaking.has(id) ? 'speaking' : ''}`}
            >
              {/* Mic: bright while speaking, faded when on but quiet */}
              {voice.micEnabled.has(id) && <span className={`mr-1 ${voice.speaking.has(id) ? '' : 'opacity-50'}`}>🎙️</span>}
              {voice.sharing.has(id) && <span className="mr-1">🖥️</span>}
              {STATUS_ICON[player.status] && <span className="mr-1">{STATUS_ICON[player.status]}</span>}
              {player.name}
              {isLocal && ' (you)'}
              {/* How long they've been focusing, so others know not to interrupt */}
              {player.status === 'focus' && (
                <span className="ml-1 font-semibold opacity-75">
                  · {minutesSince(player.focusSince, serverNow)}m{player.subject && ` · ${player.subject}`}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* NPCs: same label board, a soft "NPC" chip so nobody mistakes them for people */}
      {npcIds.map((id) => {
        const npc = npcs?.get(id);
        if (!npc) return null;
        const key = npcKey(id);
        const icon = npc.kind === 'cat' ? (npc.anim === 'nap' ? '💤' : '🐈') : (STATUS_ICON[npc.status] ?? '🧑‍🎓');
        return (
          <div
            key={key}
            ref={(el) => {
              if (el) board.labels.set(key, el);
              else board.labels.delete(key);
            }}
            className="absolute top-0 left-0 flex flex-col items-center gap-1.5"
            style={{ visibility: 'hidden' }}
          >
            <Emotes target={key} reactions={reactions} />
            <SpeechBubble bubble={bubbles[key]} now={now} />
            <div className="flex items-center gap-1 rounded-lg bg-lavender/95 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-lavender-ink shadow-sm">
              <span>{icon}</span>
              {npc.name}
              {npc.kind === 'buddy' && npc.status === 'focus' && (
                <span className="font-semibold opacity-75">
                  · {minutesSince(npc.focusSince, serverNow)}m{npc.subject && ` · ${npc.subject}`}
                </span>
              )}
              <span className="rounded bg-white/80 px-1 text-[9px] tracking-wide">NPC</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
