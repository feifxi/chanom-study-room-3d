import * as THREE from 'three';
import { COAT_BY_ID, CAT_COATS } from '@study/shared';

/*
 * A chibi cat in the same cel-shaded, ink-outlined style as the characters:
 * big head, tiny body, swaying tail. Animations: idle, walk, groom, nap (loaf).
 */

let gradientMap: THREE.DataTexture | null = null;
function getGradientMap() {
  if (!gradientMap) {
    gradientMap = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#3a2a40', side: THREE.BackSide });
const INK = '#2b2140';
const toon = (color: THREE.ColorRepresentation, opts: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: getGradientMap(), ...opts });

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, outline = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  if (outline) {
    const o = new THREE.Mesh(geo, OUTLINE);
    o.scale.setScalar(1 + outline);
    m.add(o);
  }
  parent.add(m);
  return m;
}
const sphere = (r: number, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h);

const angleLerp = (a: number, b: number, t: number) => {
  const TAU = Math.PI * 2;
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * t;
};

export class CatRig {
  readonly group = new THREE.Group();
  readonly labelHeight = 0.78;
  private yaw = 0;
  private body = new THREE.Group();
  private head = new THREE.Group();
  private tail: THREE.Group[] = [];
  private paws: THREE.Mesh[] = [];
  private eyes: THREE.Group[] = [];
  private sleepyEyes: THREE.Mesh[] = [];
  private phase = Math.random() * 10;
  private blinkIn = 2 + Math.random() * 3;
  private loaf = 0;

  constructor(coatId: string) {
    const coat = COAT_BY_ID.get(coatId) ?? CAT_COATS[0]!;
    const fur = toon(coat.body, coat.rare ? { emissive: coat.body, emissiveIntensity: 0.25 } : {});
    const belly = toon(coat.belly);
    this.group.add(this.body);
    const b = this.body;

    // Body: a soft bean, a lighter belly, little paws
    const torso = mesh(b, new THREE.CapsuleGeometry(0.14, 0.2, 6, 14), fur, 0, 0.2, -0.02, 0.05);
    torso.rotation.x = Math.PI / 2;
    mesh(b, sphere(0.12), belly, 0, 0.16, 0.04).scale.set(1, 0.8, 1.3);
    if (coat.patches) {
      coat.patches.forEach((c, i) => {
        const patch = mesh(b, sphere(0.09), toon(c), (i ? -1 : 1) * 0.07, 0.29, i ? -0.1 : 0.05);
        patch.scale.set(1, 0.45, 1.1);
      });
    }
    this.paws = [
      [-0.08, 0.13],
      [0.08, 0.13],
      [-0.08, -0.15],
      [0.08, -0.15],
    ].map(([x, z]) => mesh(b, sphere(0.05, 10, 8), coat.id === 'tuxedo' ? belly : fur, x, 0.045, z, 0.12));

    // Tail: three links that curl and sway
    let parent: THREE.Object3D = b;
    const tailStart = new THREE.Group();
    tailStart.position.set(0, 0.24, -0.2);
    b.add(tailStart);
    parent = tailStart;
    for (let i = 0; i < 3; i++) {
      const link = new THREE.Group();
      if (i > 0) link.position.y = 0.1;
      link.rotation.x = i === 0 ? -0.9 : -0.35;
      parent.add(link);
      mesh(link, new THREE.CapsuleGeometry(0.035 - i * 0.005, 0.08, 4, 8), i === 2 && coat.id === 'tuxedo' ? belly : fur, 0, 0.05, 0, 0.1);
      this.tail.push(link);
      parent = link;
    }

    // Head: big and round, ears, face
    this.head.position.set(0, 0.38, 0.17);
    b.add(this.head);
    const h = this.head;
    mesh(h, sphere(0.16, 24, 18), fur, 0, 0, 0, 0.04).scale.set(1.1, 0.95, 1);
    mesh(h, sphere(0.09), belly, 0, -0.05, 0.1).scale.set(1.2, 0.7, 0.6);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.1, 0.12, -0.01);
      ear.rotation.z = -s * 0.35;
      h.add(ear);
      mesh(ear, new THREE.ConeGeometry(0.06, 0.12, 12), fur, 0, 0, 0, 0.08);
      mesh(ear, new THREE.ConeGeometry(0.035, 0.07, 10), toon('#ffb3c8'), 0, -0.01, 0.025).scale.z = 0.5;
    }
    const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.eyes = [-1, 1].map((s) => {
      const eye = new THREE.Group();
      eye.position.set(s * 0.065, 0.01, 0.145);
      eye.rotation.y = s * 0.35;
      h.add(eye);
      mesh(eye, sphere(0.038), toon(INK), 0, 0, 0, 0, false).scale.set(0.85, 1.15, 0.35);
      mesh(eye, sphere(0.014, 8, 6), white, -s * 0.01, 0.015, 0.012, 0, false);
      return eye;
    });
    this.sleepyEyes = [-1, 1].map((s) => {
      const arc = mesh(h, new THREE.TorusGeometry(0.028, 0.008, 6, 12, Math.PI), toon(INK), s * 0.065, 0.0, 0.15, 0, false);
      arc.rotation.set(0, s * 0.35, Math.PI); // a sleepy "u"
      arc.visible = false;
      return arc;
    });
    mesh(h, sphere(0.016, 8, 6), toon('#ff8fab'), 0, -0.035, 0.165, 0, false);
    const blush = new THREE.MeshBasicMaterial({ color: '#ff8fab', transparent: true, opacity: 0.55 });
    for (const s of [-1, 1]) {
      mesh(h, sphere(0.03, 10, 8), blush, s * 0.1, -0.045, 0.12, 0, false).scale.set(1.2, 0.6, 0.3);
      for (const dy of [-0.01, 0.015]) {
        const whisker = mesh(h, new THREE.CylinderGeometry(0.003, 0.003, 0.11, 4), toon(INK), s * 0.14, -0.035 + dy, 0.11, 0, false);
        whisker.rotation.set(0, 0, Math.PI / 2 + s * dy * 6);
      }
    }
  }

  update(dt: number, t: number, targetYaw: number, pose: { anim: string; moving: boolean }) {
    this.yaw = angleLerp(this.yaw, targetYaw, Math.min(1, dt * 8));
    this.group.rotation.y = this.yaw;
    const napping = pose.anim === 'nap';
    const walking = pose.moving;
    this.loaf += ((napping ? 1 : 0) - this.loaf) * Math.min(1, dt * 4);

    const gait = Math.sin(t * 14);
    this.body.position.y = (walking ? Math.abs(gait) * 0.02 : 0) - this.loaf * 0.05;
    const breathe = Math.sin(t * (napping ? 1.4 : 2.6) + this.phase) * (napping ? 0.03 : 0.015);
    this.body.scale.set(1 + breathe, 1 - breathe * 0.5, 1);

    // Paws step in a trot; tucked under while loafing
    this.paws.forEach((paw, i) => {
      const front = i < 2;
      const side = i % 2 ? 1 : -1;
      paw.position.z = (front ? 0.13 : -0.15) + (walking ? gait * 0.04 * (front ? side : -side) : 0) - this.loaf * (front ? 0.02 : -0.02);
      paw.position.y = 0.045 + (walking ? Math.max(0, gait * (front ? side : -side)) * 0.03 : 0);
    });

    // Head: look around when idle, dip to groom, rest low when napping
    const grooming = pose.anim === 'groom';
    this.head.rotation.x = grooming ? 0.55 + Math.sin(t * 6) * 0.15 : napping ? 0.25 : Math.sin(t * 0.7 + this.phase) * 0.06;
    this.head.rotation.y = !walking && !napping && !grooming ? Math.sin(t * 0.5 + this.phase) * 0.45 : 0;
    this.head.position.y = 0.38 - this.loaf * 0.08;

    // Tail sways: lazily when idle, fast when walking, curled around when napping
    const sway = walking ? Math.sin(t * 9) * 0.5 : Math.sin(t * 1.8 + this.phase) * 0.35;
    this.tail.forEach((link, i) => {
      link.rotation.z = napping ? 0.5 + i * 0.25 : sway * (0.6 + i * 0.3);
      link.rotation.x = (i === 0 ? -0.9 : -0.35) + (napping ? (i === 0 ? 1.1 : 0.2) : 0);
    });

    // Blink; eyes closed while napping
    this.blinkIn -= dt;
    if (this.blinkIn < -0.12) this.blinkIn = 2 + Math.random() * 4;
    this.eyes.forEach((eye, i) => {
      eye.visible = !napping;
      eye.scale.y = this.blinkIn < 0 ? 0.15 : 1;
      this.sleepyEyes[i]!.visible = napping;
    });
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (o.material !== OUTLINE) (o.material as THREE.Material).dispose();
      }
    });
  }
}
