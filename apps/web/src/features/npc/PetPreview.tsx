'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CatRig } from './CatRig';

function Cat({ coat }: { coat: string }) {
  const rig = useMemo(() => new CatRig(coat), [coat]);
  useEffect(() => () => rig.dispose(), [rig]);
  // A slow turn so you see the bow, the tag or the bell from the front and the tail from behind
  useFrame((state, dt) =>
    rig.update(dt, state.clock.elapsedTime, 0.3 + Math.sin(state.clock.elapsedTime * 0.6) * 0.55, { anim: 'idle', moving: false }),
  );
  return <primitive object={rig.group} />;
}

/** A Shop pet, up close (the same cat as in the room) */
export function PetPreview({ coat }: { coat: string }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.65, 1.9], fov: 30 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.3, 0)}
      gl={{ alpha: true, antialias: true }}
    >
      <hemisphereLight args={['#ffffff', '#cbb89d', 1.6]} />
      <directionalLight position={[2, 4, 3]} intensity={2} color="#fff1dc" />
      <Cat coat={coat} />
    </Canvas>
  );
}
