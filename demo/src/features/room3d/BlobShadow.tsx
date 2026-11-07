'use client';

import * as THREE from 'three';

/**
 * A soft round shadow under a character. Moving things don't cast real shadows (the shadow map is
 * drawn once for the furniture, see StaticShadows), so this keeps them grounded for one cheap draw.
 */
let texture: THREE.CanvasTexture | null = null;
function blobTexture() {
  if (texture) return texture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(40, 24, 36, 0.42)');
  g.addColorStop(0.6, 'rgba(40, 24, 36, 0.2)');
  g.addColorStop(1, 'rgba(40, 24, 36, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function BlobShadow({ radius = 0.34, y = 0.012 }: { radius?: number; y?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={-1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={blobTexture()} transparent depthWrite={false} />
    </mesh>
  );
}
