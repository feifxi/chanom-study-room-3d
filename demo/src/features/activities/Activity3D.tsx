'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CHAIR_BACK, type LocalMotion } from '../room3d/Avatar';
import { activeMap } from '../map/active';
import { cardSeats, inArea, type Area } from '../map/types';
import type { SpotState, WatchState } from './hub';
import { BoardSurface } from './board/Board3D';
import type { BoardStore } from './board/board';
import { SideZones } from './pickASide/Side3D';
import type { SideGame } from './pickASide/game';
import { SPOTS, spotById, type SpotId } from './spots';

const OAK = '#8a6244';
const OAK_DARK = '#6b4a33';
const FELT = '#2f7a5c';
const LEATHER = '#7a4a2e';

/**
 * How a map dresses its card tables. `felt` is the game-room look (green felt, a brass shade); the
 * library's is a reading table (a burgundy leather inlay, cards and a score pad on top, no hanging
 * lamp), so it doesn't read as a casino. The other maps keep felt until their own pass.
 */
const TABLE_LOOKS = {
  felt: { top: OAK, inlay: FELT, shade: '#c9a24a', shadeMetal: 0.5, props: false, pendant: true },
  // No pendant over the library's tables: hanging lamps cluttered the room camera's view
  library: { top: OAK_DARK, inlay: '#7c3a3f', shade: '#e9dcc4', shadeMetal: 0, props: true, pendant: false },
} as const;

/**
 * The card tables (static, inside the room's StaticBatch): round tables with an inlay, four
 * leather-topped stools each and a shaded lamp hanging over the middle. Feature 12 brings the game.
 */
export function CardTables({ look = 'felt' }: { look?: keyof typeof TABLE_LOOKS }) {
  const L = TABLE_LOOKS[look];
  return (
    <>
      {activeMap().cardTables.map((t, ti) => (
        <group key={t.id} position={[t.x, 0, t.z]}>
          <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[t.r, t.r, 0.06, 32]} />
            <meshStandardMaterial color={L.top} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.755, 0]} receiveShadow>
            <cylinderGeometry args={[t.r - 0.09, t.r - 0.09, 0.012, 32]} />
            <meshStandardMaterial color={L.inlay} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.36, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.14, 0.72, 12]} />
            <meshStandardMaterial color={OAK_DARK} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.04, 16]} />
            <meshStandardMaterial color={OAK_DARK} />
          </mesh>
          {/* Pendant lamp: cord from the ceiling, a shade, the bulb glows at night (see the map's bulbs) */}
          {L.pendant && (
            <>
              <mesh position={[0, 3.0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 2.4, 4]} />
                <meshStandardMaterial color="#3a3036" />
              </mesh>
              <mesh position={[0, 1.78, 0]} castShadow>
                <coneGeometry args={[0.3, 0.26, 20, 1, true]} />
                <meshStandardMaterial
                  color={L.shade}
                  metalness={L.shadeMetal}
                  roughness={L.shadeMetal ? 0.4 : 0.9}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </>
          )}
          {L.props && <TableTop flip={ti % 2 === 1} />}
          {cardSeats(t).map((s) => {
            // The stool sits where a chair's seat would, a little behind the seat point
            const bx = s.x - t.x - Math.sin(s.yaw) * CHAIR_BACK;
            const bz = s.z - t.z - Math.cos(s.yaw) * CHAIR_BACK;
            return (
              <group key={s.id} position={[bx, 0, bz]}>
                <mesh position={[0, 0.44, 0]} castShadow>
                  <cylinderGeometry args={[0.22, 0.22, 0.07, 20]} />
                  <meshStandardMaterial color={LEATHER} roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.04, 0.07, 0.4, 8]} />
                  <meshStandardMaterial color={OAK_DARK} />
                </mesh>
                <mesh position={[0, 0.04, 0]}>
                  <cylinderGeometry args={[0.16, 0.16, 0.03, 12]} />
                  <meshStandardMaterial color={OAK_DARK} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </>
  );
}

const CARD_BACK = '#f3ede4';
const CARD_EDGE = '#7c3a3f';
/**
 * What's left on a library card table between games: a deck, a few cards dealt face down, a score pad
 * and pencil. Cards are drawn a bit bigger than life so they read from the room camera.
 */
function TableTop({ flip }: { flip: boolean }) {
  const y = 0.765;
  const card = [0.13, 0.006, 0.18] as const;
  return (
    // Turn every other table so the two don't look copied
    <group position={[0, y, 0]} rotation={[0, flip ? 2.2 : 0.4, 0]}>
      {/* The deck: a short stack with a darker band showing the edges */}
      <mesh position={[0.14, 0.025, -0.06]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[card[0], 0.05, card[2]]} />
        <meshStandardMaterial color={CARD_EDGE} roughness={0.8} />
      </mesh>
      <mesh position={[0.14, 0.051, -0.06]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[card[0], 0.004, card[2]]} />
        <meshStandardMaterial color={CARD_BACK} roughness={0.8} />
      </mesh>
      {/* Four cards dealt face down, fanned towards the seats */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={i} position={[Math.sin(a) * 0.3, 0.004 + i * 0.002, Math.cos(a) * 0.3]} rotation={[0, a, 0]}>
            <mesh>
              <boxGeometry args={card} />
              <meshStandardMaterial color={CARD_BACK} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.0035, 0]}>
              <boxGeometry args={[card[0] - 0.035, 0.001, card[2] - 0.035]} />
              <meshStandardMaterial color={CARD_EDGE} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
      {/* A score pad and a pencil */}
      <mesh position={[-0.13, 0.006, 0.02]} rotation={[0, -0.25, 0]}>
        <boxGeometry args={[0.14, 0.012, 0.19]} />
        <meshStandardMaterial color="#fbf6e9" roughness={0.9} />
      </mesh>
      <mesh position={[-0.06, 0.014, 0.05]} rotation={[0, -0.25, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 0.17, 6]} />
        <meshStandardMaterial color="#e8b04a" />
      </mesh>
    </group>
  );
}

/** The big screen's frame on the lounge console (static); the picture is ScreenSurface. */
export function BigScreen() {
  const TV = activeMap().tv;
  return (
    <group position={[TV.x, TV.y, TV.z]} rotation={[0, TV.yaw, 0]}>
      <mesh castShadow>
        <boxGeometry args={[TV.width + 0.14, TV.height + 0.14, 0.08]} />
        <meshStandardMaterial color="#2b2430" roughness={0.6} />
      </mesh>
      {/* Stand feet (on a console) or a wall bracket behind */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * TV.width * 0.3, -TV.height / 2 - 0.1, 0.06]}>
          <boxGeometry args={[0.12, 0.06, 0.3]} />
          <meshStandardMaterial color="#2b2430" />
        </mesh>
      ))}
      {/* Two little speakers beside it, standing on whatever the screen stands on */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (TV.width / 2 + 0.22), -TV.height / 2 + 0.04, 0.1]} castShadow>
          <boxGeometry args={[0.16, 0.24, 0.2]} />
          <meshStandardMaterial color="#4a3443" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A screen share on the big screen, as passers-by see it: a card with who's sharing, never the live
 * picture (a video texture would cost frame time and data for the whole room, decided 2026-11-20).
 */
function shareCard(name: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 288;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 512, 288);
  bg.addColorStop(0, '#2b2f5c');
  bg.addColorStop(1, '#4b2d55');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 288);
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = '64px system-ui, sans-serif';
  g.fillText('🖥️', 256, 120);
  g.font = '800 34px system-ui, sans-serif';
  g.fillText(name === 'You' ? 'You’re sharing' : `${name} is sharing`, 256, 190);
  g.font = '600 22px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillText('Step onto the rug to watch', 256, 232);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * What passers-by see on the big screen: the video's thumbnail while something's on (the video
 * itself plays in the watch panel), a soft glow when paused, dark when off, and a "Jod is sharing"
 * card during a screen share.
 */
function ScreenSurface({ videoId, paused, shareName }: { videoId: string | null; paused: boolean; shareName: string | null }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (shareName) {
      const t = shareCard(shareName);
      // Loaded in an effect: the card needs the DOM's canvas, and is disposed with the share
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTexture(t);
      return () => {
        t.dispose();
        setTexture(null);
      };
    }
    if (!videoId) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        if (alive) setTexture(t);
        else t.dispose();
      },
      undefined,
      // No thumbnail (offline, blocked): the screen just glows
      () => alive && setTexture(null),
    );
    return () => {
      alive = false;
      setTexture((old) => (old?.dispose(), null));
    };
  }, [videoId, shareName]);
  const on = !!videoId || !!shareName;
  // A share shows at full glow even though the video under it is paused
  paused = paused && !shareName;
  const TV = activeMap().tv;
  return (
    <mesh
      position={[TV.x + Math.sin(TV.yaw) * 0.045, TV.y, TV.z + Math.cos(TV.yaw) * 0.045]}
      rotation={[0, TV.yaw, 0]}
      userData={{ dynamic: true }}
    >
      <planeGeometry args={[TV.width, TV.height]} />
      <meshStandardMaterial
        key={texture ? 'pic' : 'plain'}
        map={on ? texture : null}
        color={on ? (texture ? (paused ? '#9a9a9a' : '#ffffff') : '#5a6fd6') : '#15131a'}
        emissive={on ? '#ffffff' : '#000000'}
        emissiveMap={on ? texture : null}
        emissiveIntensity={on ? (paused ? 0.25 : 0.6) : 0}
        roughness={0.4}
      />
    </mesh>
  );
}

const RING_COLOR: Record<string, string> = { gathering: '#ffb3cf', playing: '#ff6fa8', results: '#ffd36e' };

/**
 * What passers-by see of each activity (the "3D world" layer): a glowing edge around a rug that's
 * gathering or playing, a soft flash of the rug's edge when you step onto one, cards on the card
 * table mid-round, and Pick a Side's zones on the floor.
 */
export function ActivityLayer3D({
  spots,
  watch,
  shareName = null,
  side,
  board,
  motion,
}: {
  spots: Record<SpotId, SpotState>;
  watch: WatchState;
  /** Who's sharing their screen on the TV ("You" for you), or null. */
  shareName?: string | null;
  side: SideGame | null;
  board: BoardStore;
  /** Your predicted position, for the step-on flash. */
  motion?: React.RefObject<LocalMotion>;
}) {
  return (
    <>
      <BoardSurface board={board} />
      <ScreenSurface videoId={watch.now?.id ?? null} paused={watch.paused} shareName={shareName} />
      {/* A free zone (the always-on whiteboard) has no outline: walking up opens the board */}
      {SPOTS.filter((s) => s.built && !s.freeZone && spots[s.id].phase !== 'free').map((s) => (
        <AreaOutline
          key={s.id}
          area={s.area}
          color={RING_COLOR[spots[s.id].phase] ?? '#ffb3cf'}
          breathe={spots[s.id].phase === 'gathering'}
        />
      ))}
      {motion && <StepOnFlash motion={motion} spots={spots} />}
      {spots.cards.phase === 'playing' && <TableCards players={spots.cards.players.length + spots.cards.out.length} />}
      {spots.floor.phase === 'playing' && side && side.stage !== 'done' && <SideZones game={side} area={spotById('floor').area} />}
    </>
  );
}

/** A thin band just inside the rug's edge, whatever its shape. */
function outlineShape(area: Area, width = 0.09): THREE.Shape {
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  if (area.kind === 'circle') {
    shape.absarc(0, 0, area.r, 0, Math.PI * 2, false);
    hole.absarc(0, 0, area.r - width, 0, Math.PI * 2, true);
  } else {
    const hw = area.w / 2;
    const hd = area.d / 2;
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -hd);
    shape.lineTo(hw, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();
    hole.moveTo(-hw + width, -hd + width);
    hole.lineTo(-hw + width, hd - width);
    hole.lineTo(hw - width, hd - width);
    hole.lineTo(hw - width, -hd + width);
    hole.closePath();
  }
  shape.holes.push(hole);
  return shape;
}

function AreaOutline({ area, color, breathe, opacity = 0.9 }: { area: Area; color: string; breathe: boolean; opacity?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const shape = useState(() => outlineShape(area))[0];
  useFrame((state) => {
    // Gathering breathes ("come join"); playing holds still
    if (ref.current && breathe) ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.02);
  });
  return (
    <mesh ref={ref} position={[area.x, 0.03, area.z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ dynamic: true }}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

const FLASH_S = 1.1;

/**
 * Step onto a rug (an activity spot or a private zone) and its edge lights up for a second, then
 * fades: you know you're "in" without a ring hanging around.
 */
function StepOnFlash({ motion, spots }: { motion: React.RefObject<LocalMotion>; spots: Record<SpotId, SpotState> }) {
  const [at, setAt] = useState<{ key: string; area: Area; color: string } | null>(null);
  const last = useRef<string | null>(null);
  const since = useRef(0);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    const m = motion.current;
    // Not the whiteboard: walking up to it opens the board, which says enough
    const spot = SPOTS.find((s) => s.built && !s.freeZone && inArea(s.area, m.x, m.z));
    const zone = spot ? undefined : activeMap().zones.find((zn) => inArea(zn.area, m.x, m.z));
    const key = spot?.id ?? zone?.id ?? null;
    if (key !== last.current) {
      last.current = key;
      // A live spot already has its glowing edge: a second, paler flash on top shows two colours
      if (key && !(spot && spots[spot.id].phase !== 'free')) {
        since.current = state.clock.elapsedTime;
        setAt({ key, area: (spot?.area ?? zone?.area)!, color: zone ? '#b9a2ff' : '#ffd6e6' });
      }
    }
    if (mat.current) mat.current.opacity = Math.max(0, 0.95 * (1 - (state.clock.elapsedTime - since.current) / FLASH_S));
  });
  if (!at) return null;
  return (
    <mesh key={at.key} position={[at.area.x, 0.032, at.area.z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ dynamic: true }}>
      <shapeGeometry args={[outlineShape(at.area, 0.12)]} />
      <meshBasicMaterial ref={mat} color={at.color} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/** A pile in the middle and a few face-down cards in front of each seat (the first card table). */
function TableCards({ players }: { players: number }) {
  const table = activeMap().cardTables[0]!;
  const cards: { x: number; z: number; r: number; color: string }[] = [];
  for (let i = 0; i < 5; i++) cards.push({ x: (i - 2) * 0.03, z: (i % 2) * 0.04, r: i * 0.5, color: i === 4 ? '#ffffff' : '#f6f0ff' });
  cardSeats(table)
    .slice(0, Math.max(2, players))
    .forEach((s, i) => {
      const dx = (s.x - table.x) * 0.38;
      const dz = (s.z - table.z) * 0.38;
      for (let k = 0; k < 3; k++)
        cards.push({ x: dx + (k - 1) * 0.07, z: dz, r: s.yaw + (k - 1) * 0.15, color: ['#e0457b', '#7c5cff', '#12a37f', '#ef8a3c'][i]! });
    });
  return (
    <group position={[table.x, 0.77, table.z]}>
      {cards.map((c, i) => (
        <mesh key={i} position={[c.x, i * 0.002, c.z]} rotation={[-Math.PI / 2, 0, c.r]} userData={{ dynamic: true }}>
          <planeGeometry args={[0.12, 0.17]} />
          <meshStandardMaterial color={c.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
