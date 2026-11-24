'use client';

import { useFrame } from '@react-three/fiber';
import { HeadphoneOff } from 'lucide-react';
import * as THREE from 'three';
import type { NpcView, PlayerView } from '@connecta/shared';
import { npcKey, type Bubble, type Reaction } from './roomSession';
import { focusedFor, useNow } from '@/lib/time';
import { toServerTime } from '@/lib/serverClock';
import { STATUS_ICON } from '../focus/status';
import { activeMap } from '../map/active';
import { inArea, type Area, type Zone } from '../map/types';
import { zoneAt } from './zones';

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
  /** Activity spots' floating names (tables, the open floor, the TV). */
  spotTags?: SpotTag[];
  /** A mark before someone's name from a game (Slave's 👑 King and 🧹 Slave). */
  badges?: Record<string, string>;
  board: LabelBoard;
  ids: string[];
  players: Map<string, PlayerView>;
  localId: string;
  bubbles: Record<string, Bubble>;
  voice: {
    speaking: Set<string>;
    micEnabled: Set<string>;
    sharing: Set<string>;
    deafened?: Set<string>;
    /** No input for 10 minutes: 💤 and a faded label (mic is off too). */
    away?: Set<string>;
    /** Owner or mod talking to everyone: heard at full volume anywhere in the room. */
    stage?: Set<string>;
  };
  npcIds: string[];
  npcs: Map<string, NpcView> | undefined;
  reactions: Reaction[];
}

function SpeechBubble({ bubble, now }: { bubble?: Bubble; now: number }) {
  if (!bubble || bubble.until <= now) return null;
  return (
    <div className="w-max max-w-56 rounded-xl bg-white px-2.5 py-1.5 text-center text-xs leading-snug font-semibold text-[#45323d] shadow-md">
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

/** They're inside a private zone and you aren't in the same one. */
function inOtherZone(p: { x: number; z: number }, me: { x: number; z: number } | undefined) {
  const theirs = zoneAt(p.x, p.z);
  return !!theirs && (!me || zoneAt(me.x, me.z) !== theirs);
}

export function LabelLayer({
  board,
  ids,
  players,
  localId,
  bubbles,
  voice,
  npcIds,
  npcs,
  reactions,
  spotTags = [],
  badges = {},
}: LayerProps) {
  // Re-render every second: status/subject come from synced state, which React doesn't watch
  const now = useNow(1000);
  // Focus times are the server's
  const serverNow = toServerTime(now);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* First, so people's names draw over a zone's name */}
      <ZoneTags board={board} me={players.get(localId)} />
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
                isLocal ? 'bg-primary' : 'bg-cocoa/85'
              } ${voice.speaking.has(id) ? 'speaking' : ''} ${voice.away?.has(id) ? 'opacity-55' : ''}`}
            >
              {badges[id] && <span className="mr-1">{badges[id]}</span>}
              {voice.stage?.has(id) && <span className="mr-1">📢</span>}
              {voice.away?.has(id) && <span className="mr-1">💤</span>}
              {/* In a private zone you're not in: you can see them but can't hear them (feature 6) */}
              {!isLocal && inOtherZone(player, players.get(localId)) && <span className="mr-1">🔇</span>}
              {/* Deafened (can't hear the room), like Discord's crossed headphones, so nobody talks to them in vain */}
              {voice.deafened?.has(id) && (
                <HeadphoneOff className="mr-1 inline size-3 -translate-y-px text-[#ffb3c4]" aria-label="Deafened" />
              )}
              {/* Mic: bright while speaking, faded when on but quiet */}
              {!voice.deafened?.has(id) && voice.micEnabled.has(id) && (
                <span className={`mr-1 ${voice.speaking.has(id) ? '' : 'opacity-50'}`}>🎙️</span>
              )}
              {voice.sharing.has(id) && <span className="mr-1">🖥️</span>}
              {/* Taking a photo (feature 10), so people can pose */}
              {player.photo && <span className="mr-1">📸</span>}
              {STATUS_ICON[player.status] && <span className="mr-1">{STATUS_ICON[player.status]}</span>}
              {/* Away during a break: the break still runs, so the cup stays too */}
              {player.status === 'away' && player.statusEndsAt > 0 && <span className="mr-1">{STATUS_ICON.break}</span>}
              {/* Plus: a shimmering name (feature 15) */}
              {player.plus ? <span className="shimmer">✨{player.name}</span> : player.name}
              {isLocal && ' (you)'}
              {/* The Connecta team in a Common room (feature 14) */}
              {player.team && <span className="ml-1 rounded-full bg-mint px-1.5 text-[10px] font-black text-mint-ink">Connecta team</span>}
              {/* How long they've been focusing, so others know not to interrupt */}
              {player.status === 'focus' && (
                <span className="ml-1 font-semibold opacity-75">
                  · {focusedFor(player.focusSince, serverNow)}
                  {player.subject && ` · ${player.subject}`}
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
        const icon = npc.kind === 'cat' ? (npc.anim === 'nap' ? '💤' : npc.owner ? '🐾' : '🐈') : (STATUS_ICON[npc.status] ?? '🧑‍🎓');
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
              {npc.ownerName && <span className="font-semibold opacity-75">· {npc.ownerName}’s cat</span>}
              {npc.kind === 'buddy' && npc.status === 'focus' && (
                <span className="font-semibold opacity-75">
                  · {focusedFor(npc.focusSince, serverNow)}
                  {npc.subject && ` · ${npc.subject}`}
                </span>
              )}
              {!npc.owner && <span className="rounded bg-white/80 px-1 text-[9px] tracking-wide">NPC</span>}
            </div>
          </div>
        );
      })}
      {/* Last, so a spot's name draws over the names of the people gathered under it */}
      <SpotTags board={board} me={players.get(localId)} tags={spotTags} />
    </div>
  );
}

/**
 * Private zones' tags, floating high over each zone's middle like a name tag (maps with
 * `floatingZoneTags`): a label rather than a prop, so it reads straight from any zoom. Just "Private
 * zone" (the rug says where you are); it lights up while you're inside it.
 */
export function ZoneTags({ board, me }: { board: LabelBoard; me: { x: number; z: number } | undefined }) {
  const map = activeMap();
  if (!map.floatingZoneTags) return null;
  const mine = me ? zoneAt(me.x, me.z) : undefined;
  return (
    <>
      {map.zones.map((zone) => (
        <ZoneTag key={zone.id} board={board} zone={zone} here={mine === zone} />
      ))}
    </>
  );
}

function ZoneTag({ board, zone, here }: { board: LabelBoard; zone: Zone; here: boolean }) {
  return (
    <FloatTag
      board={board}
      id={`zone:${zone.id}`}
      x={zone.area.x}
      z={zone.area.z}
      className={here ? 'bg-lavender text-lavender-ink' : 'bg-cocoa/80 text-white'}
    >
      🔇 Private zone
    </FloatTag>
  );
}

/** An activity spot's floating name: "🃏 Card games", or what's on there ("🤔 Would you rather · 5 playing"). */
export interface SpotTag {
  id: string;
  text: string;
  phase: 'free' | 'gathering' | 'playing';
  area: Area;
}

/** Idle spots name themselves as you come near; live ones show from anywhere, so a game is easy to find. */
const SPOT_TAG_NEAR = 6.5;

function SpotTags({ board, me, tags }: { board: LabelBoard; me: { x: number; z: number } | undefined; tags: SpotTag[] }) {
  return (
    <>
      {tags
        // Not the one you're in: the panel and the top strip already say what's on
        .filter((t) => !me || !inArea(t.area, me.x, me.z))
        .filter((t) => t.phase !== 'free' || (me && Math.hypot(t.area.x - me.x, t.area.z - me.z) <= SPOT_TAG_NEAR))
        .map((t) => (
          <FloatTag
            key={t.id}
            board={board}
            id={`spot:${t.id}`}
            x={t.area.x}
            z={t.area.z}
            // Just over people's names: any higher and the camera's tilt carries it off over the
            // next spot (it's drawn on top of the names, so a crowd never hides it)
            y={2.6}
            // The same colours as the Activities list's dots: green gathering, pink playing
            className={
              t.phase === 'gathering'
                ? 'bg-online text-white'
                : t.phase === 'playing'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/90 text-foreground'
            }
          >
            {t.text}
          </FloatTag>
        ))}
    </>
  );
}

/** A pill floating over a spot of floor, above the names of people standing there. */
function FloatTag({
  board,
  id,
  x,
  z,
  y = 3.3,
  className,
  children,
}: {
  board: LabelBoard;
  id: string;
  x: number;
  z: number;
  y?: number;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={(el) => {
        if (el) {
          board.labels.set(id, el);
          // High enough to clear the names of people standing or sitting there
          board.anchors.set(id, new THREE.Vector3(x, y, z));
        } else {
          board.labels.delete(id);
          board.anchors.delete(id);
        }
      }}
      className="absolute top-0 left-0"
      style={{ visibility: 'hidden' }}
    >
      <div className={`rounded-xl px-2.5 py-1 text-xs font-black whitespace-nowrap shadow-sm transition-colors ${className}`}>
        {children}
      </div>
    </div>
  );
}
