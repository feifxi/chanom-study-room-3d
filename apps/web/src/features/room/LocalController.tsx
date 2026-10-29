'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LocalMotion } from './Avatar';
import { LocalPlayerDriver, type Hint, type OrbitTarget } from './LocalPlayerDriver';
import type { StudyRoom } from './roomSession';
import { pickTapTarget } from './tapToWalk';

export type { Hint } from './LocalPlayerDriver';

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

/** A press shorter and stiller than this is a tap; anything else is the camera being dragged. */
const TAP_MAX_MS = 350;
const TAP_MAX_PX = 10;

interface Props {
  room: StudyRoom;
  motion: React.RefObject<LocalMotion>;
  /** Called when the nearest interaction in reach changes (null = none). */
  onHint: (hint: Hint | null) => void;
  /** Open the Buddy Machine panel. */
  onOpenMachine: () => void;
  /** Receives the driver, so the on-screen action button can press "E". */
  driverRef?: React.RefObject<LocalPlayerDriver | null>;
}

/** Wires the keyboard, taps and the render loop to the local player's driver. */
export function LocalController({ room, motion, onHint, onOpenMachine, driverRef }: Props) {
  const driver = useMemo(() => new LocalPlayerDriver(room, motion), [room, motion]);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as OrbitTarget | null;
  const marker = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!driverRef) return;
    driverRef.current = driver;
    return () => {
      driverRef.current = null;
    };
  }, [driver, driverRef]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      if (driver.press(e.code) === 'openMachine') onOpenMachine();
    };
    const up = (e: KeyboardEvent) => driver.release(e.code);
    const blur = () => driver.releaseAll();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [driver, onOpenMachine]);

  // Tap (or click) the room to walk there. Drags and pinches stay with the camera.
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number; at: number }>();
    let multiTouch = false;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, at: performance.now() });
      if (pointers.size > 1) multiTouch = true;
    };
    const onUp = (e: PointerEvent) => {
      const start = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      const wasMulti = multiTouch;
      if (pointers.size === 0) multiTouch = false;
      if (!start || wasMulti) return;
      if (performance.now() - start.at > TAP_MAX_MS || Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_MAX_PX) return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // The first visible thing under the finger (a chair, a cat, the floor), else the floor plane
      const point = ray.intersectObjects(scene.children, true).find((h) => isShown(h.object))?.point ?? ray.ray.intersectPlane(floor, hit);
      if (point) driver.tap(pickTapTarget(room, { x: point.x, z: point.z }));
    };
    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) multiTouch = false;
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
  }, [gl, camera, scene, driver, room]);

  useFrame((state, dt) => {
    const hint = driver.frame(dt, camera, controls);
    if (hint !== undefined) onHint(hint);
    if (driver.takeAction() === 'openMachine') onOpenMachine();
    // A soft ring where tap-to-walk is heading
    const dest = driver.destination;
    const ring = marker.current;
    if (ring) {
      ring.visible = !!dest;
      if (dest) {
        ring.position.set(dest.x, 0.02, dest.z);
        ring.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 6) * 0.08);
      }
    }
  });

  return (
    <mesh ref={marker} rotation-x={-Math.PI / 2} visible={false} userData={{ dynamic: true }} raycast={() => null}>
      <ringGeometry args={[0.22, 0.3, 32]} />
      <meshBasicMaterial color="#e8799a" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

/** Hidden objects (the originals StaticBatch merged, invisible markers) don't count as tapped. */
function isShown(o: THREE.Object3D | null): boolean {
  for (let n = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}
