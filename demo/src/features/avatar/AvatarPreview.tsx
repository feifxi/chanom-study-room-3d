'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { AvatarLook } from '@study/shared';
import { CharacterRig } from './character';

function Model({ look }: { look: AvatarLook }) {
  const rig = useMemo(() => new CharacterRig(look), [look]);
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    rig.update(dt, t, Math.sin(t * 0.7) * 0.6, { walking: false, seated: false, talking: false, happy: Math.sin(t * 0.5) > 0.9 });
  });
  return <primitive object={rig.group} />;
}

/** Small spinning portrait of a look, for the lobby and profile editor. */
export function AvatarPreview({ look }: { look: AvatarLook }) {
  return (
    <Canvas camera={{ fov: 28, position: [0, 1.05, 4.6] }} dpr={[1, 2]} onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)}>
      <hemisphereLight args={['#ffffff', '#cbb89d', 1.6]} />
      <directionalLight position={[2, 4, 3]} intensity={2} color="#fff1dc" />
      <Model look={look} />
    </Canvas>
  );
}
