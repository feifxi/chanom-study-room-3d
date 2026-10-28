'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CLIENT_SEND_HZ, RUN_SPEED, SEATS, SEAT_BY_ID, SIT_REACH, WALK_SPEED, type PlayerView } from '@study/shared';
import { resolveCollisions } from './collision';
import type { LocalMotion } from './Avatar';
import type { StudyRoom } from './useStudyRoom';

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
const UP = new THREE.Vector3(0, 1, 0);
/** If our prediction drifts this far from the server, snap to the server. */
const SNAP_DISTANCE = 1.2;

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

interface Props {
  room: StudyRoom;
  motion: React.RefObject<LocalMotion>;
  /** Called when the nearest free seat in reach changes (null = none). */
  onNearSeat: (seatId: string | null) => void;
}

export function LocalController({ room, motion, onNearSeat }: Props) {
  const keys = useRef(new Set<string>());
  const nearSeat = useRef<string | null>(null);
  const lastSent = useRef({ at: 0, x: 0, z: 0, yaw: 0, moving: false });
  const standSentAt = useRef(0);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const scratch = useRef({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), move: new THREE.Vector3(), follow: new THREE.Vector3() });

  const me = (): PlayerView | undefined => room.state.players.get(room.sessionId);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (KEYS[e.code] || e.code.startsWith('Shift')) {
        keys.current.add(e.code);
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
      if (e.code === 'KeyE' && !e.repeat) {
        const p = me();
        if (p?.seatId) room.send('stand', {});
        else if (nearSeat.current) room.send('sit', { seatId: nearSeat.current });
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [room]);

  useFrame((_state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = me();
    const m = motion.current;
    if (!p || !m) return;
    const { fwd, right, move, follow } = scratch.current;

    let ix = 0;
    let iz = 0;
    for (const code of keys.current) {
      const k = KEYS[code];
      if (k) {
        ix += k[0];
        iz += k[1];
      }
    }

    if (p.seatId) {
      // Seated: the server owns our position. Any movement key stands us up.
      const seat = SEAT_BY_ID.get(p.seatId);
      if (seat) {
        m.x = seat.x;
        m.z = seat.z;
        m.yaw = seat.yaw;
      }
      m.moving = false;
      if ((ix || iz) && performance.now() - standSentAt.current > 400) {
        standSentAt.current = performance.now();
        room.send('stand', {});
      }
    } else {
      if (Math.hypot(p.x - m.x, p.z - m.z) > SNAP_DISTANCE) {
        m.x = p.x;
        m.z = p.z;
      }
      m.moving = !!(ix || iz);
      if (m.moving) {
        // Keys move relative to the camera, so "up" is always up the screen
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        right.crossVectors(fwd, UP);
        move.set(0, 0, 0).addScaledVector(fwd, -iz).addScaledVector(right, ix).normalize();
        const running = keys.current.has('ShiftLeft') || keys.current.has('ShiftRight');
        const step = (running ? RUN_SPEED : WALK_SPEED) * dt;
        const next = { x: m.x + move.x * step, z: m.z + move.z * step };
        const others: { x: number; z: number }[] = [];
        room.state.players.forEach((o, id) => {
          if (id !== room.sessionId) others.push(o);
        });
        resolveCollisions(next, others);
        m.x = next.x;
        m.z = next.z;
        m.yaw = Math.atan2(move.x, move.z);
      }

      // Send at a fixed rate while moving, plus once when we stop
      const now = performance.now();
      const ls = lastSent.current;
      const changed = Math.abs(ls.x - m.x) > 0.01 || Math.abs(ls.z - m.z) > 0.01 || ls.moving !== m.moving;
      if (changed && now - ls.at > 1000 / CLIENT_SEND_HZ) {
        room.send('move', { x: m.x, z: m.z, yaw: m.yaw, moving: m.moving });
        Object.assign(ls, { at: now, x: m.x, z: m.z, yaw: m.yaw, moving: m.moving });
      }
    }

    // Nearest free seat within reach, for the "press E" hint
    let best: string | null = null;
    if (!p.seatId) {
      let bestD = SIT_REACH * 0.8;
      const taken = new Set<string>();
      room.state.players.forEach((o) => o.seatId && taken.add(o.seatId));
      for (const s of SEATS) {
        const d = Math.hypot(s.x - m.x, s.z - m.z);
        if (d < bestD && !taken.has(s.id)) {
          bestD = d;
          best = s.id;
        }
      }
    }
    if (best !== nearSeat.current) {
      nearSeat.current = best;
      onNearSeat(best);
    }

    // Camera follows us smoothly
    if (controls) {
      follow.set(m.x, 0.6, m.z).sub(controls.target).multiplyScalar(Math.min(1, dt * 4));
      controls.target.add(follow);
      camera.position.add(follow);
    }
  });

  return null;
}
