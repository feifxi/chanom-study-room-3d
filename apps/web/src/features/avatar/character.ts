import * as THREE from 'three';
import type { AvatarLook } from '@study/shared';

/*
 * Anime moe chibi characters, built from Three.js primitives.
 * Cel shading (3-step toon gradient) with inverted-hull ink outlines.
 */

const HEAD_Y = 1.1;
/** Hip pivot height, and how far the body rises to rest on a chair seat (seat top ≈ 0.47 m). */
const HIP_Y = 0.22;
export const SIT_LIFT = 0.29;
const R = 0.44;
const SKIN = '#ffe6da';
const INK = '#2b2140';

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

const toon = (color: THREE.ColorRepresentation, opts: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: getGradientMap(), ...opts });

interface MeshOpts {
  shadow?: boolean;
  /** Adds an ink outline scaled by this fraction (0 = none). */
  outline?: number;
}

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, { shadow = true, outline = 0 }: MeshOpts = {}) {
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

const sphere = (r: number, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const flat = { shadow: false };

function cone(parent: THREE.Object3D, r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, rx: number, ry: number, rz: number, flatten = 0.55) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.set(rx, ry, rz, 'YXZ');
  parent.add(pivot);
  mesh(pivot, new THREE.ConeGeometry(r, h, 10), mat, 0, 0, 0, { outline: 0.06 }).scale.z = flatten;
  return pivot;
}

function buildEye(head: THREE.Object3D, side: number, irisColor: string) {
  const eye = new THREE.Group();
  eye.position.set(side * 0.16, -0.04, 0.4);
  eye.rotation.y = side * 0.38;
  head.add(eye);
  const light = new THREE.Color(irisColor).lerp(new THREE.Color('#ffffff'), 0.55);
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  mesh(eye, sphere(0.1), toon(INK), 0, 0, 0, flat).scale.set(0.8, 1.3, 0.3);
  mesh(eye, sphere(0.08), toon(irisColor), 0, -0.02, 0.01, flat).scale.set(0.75, 1.05, 0.3);
  mesh(eye, sphere(0.05), new THREE.MeshBasicMaterial({ color: light }), 0, -0.065, 0.018, flat).scale.set(0.85, 0.55, 0.3);
  mesh(eye, sphere(0.034, 10, 8), white, -side * 0.03, 0.05, 0.032, flat);
  mesh(eye, sphere(0.016, 8, 6), white, side * 0.03, -0.06, 0.032, flat);
  const lash = mesh(eye, new THREE.CapsuleGeometry(0.02, 0.15, 4, 8), toon(INK), 0, 0.125, 0.01, flat);
  lash.rotation.z = Math.PI / 2 - side * 0.15;
  const flick = mesh(eye, new THREE.ConeGeometry(0.022, 0.07, 6), toon(INK), side * 0.1, 0.12, 0.01, flat);
  flick.rotation.z = -side * 1.1;
  return eye;
}

type Accessory = (head: THREE.Object3D, look: ResolvedLook, sway: THREE.Object3D[]) => void;

interface ResolvedLook extends AvatarLook {
  eyes: string;
  trim: string;
}

const ACCESSORIES: Partial<Record<AvatarLook['accessory'], Accessory>> = {
  ribbon(head, look) {
    const mat = toon(look.trim);
    const bow = new THREE.Group();
    bow.position.set(0.28, 0.34, 0.12);
    bow.rotation.set(0.2, 0.3, -0.5);
    head.add(bow);
    for (const s of [-1, 1]) {
      const loop = mesh(bow, new THREE.ConeGeometry(0.12, 0.22, 16), mat, s * 0.12, 0, 0, { outline: 0.08 });
      loop.rotation.z = (s * Math.PI) / 2;
      loop.scale.z = 0.5;
    }
    mesh(bow, sphere(0.05), mat, 0, 0, 0, { outline: 0.15 });
  },
  glasses(head) {
    const mat = toon('#3a3550');
    for (const s of [-1, 1]) {
      mesh(head, new THREE.TorusGeometry(0.115, 0.013, 8, 28), mat, s * 0.16, -0.04, 0.44, flat).rotation.y = s * 0.38;
    }
    mesh(head, new THREE.CylinderGeometry(0.009, 0.009, 0.09, 6), mat, 0, -0.02, 0.46, flat).rotation.z = Math.PI / 2;
  },
  catEars(head, look) {
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.27, 0.38, -0.02);
      ear.rotation.z = -s * 0.45;
      head.add(ear);
      mesh(ear, new THREE.ConeGeometry(0.15, 0.28, 16), toon(look.hair), 0, 0, 0, { outline: 0.07 });
      mesh(ear, new THREE.ConeGeometry(0.085, 0.17, 16), toon('#ffb3c8'), 0, -0.02, 0.06).scale.z = 0.5;
    }
  },
  headphones(head, look) {
    mesh(head, new THREE.TorusGeometry(0.5, 0.038, 10, 32, Math.PI), toon('#3a3f52'), 0, 0.02, 0, { outline: 0.02 });
    for (const s of [-1, 1]) {
      mesh(head, new THREE.CylinderGeometry(0.12, 0.12, 0.1, 20), toon(look.outfit), s * 0.48, 0, 0, { outline: 0.08 }).rotation.z = Math.PI / 2;
    }
  },
  ahoge(head, look, sway) {
    const strand = mesh(head, new THREE.TorusGeometry(0.11, 0.024, 8, 20, Math.PI * 1.3), toon(look.hair), 0.02, 0.58, 0.02);
    strand.rotation.set(0, Math.PI / 2, 0.4);
    sway.push(strand);
  },
  twintails(head, look, sway) {
    const hair = toon(look.hair);
    const clip = toon(look.trim, { emissive: look.trim, emissiveIntensity: 0.3 });
    for (const s of [-1, 1]) {
      sway.push(cone(head, 0.14, 0.62, hair, s * 0.5, -0.12, -0.12, 0, 0, Math.PI - s * 0.3, 0.7));
      mesh(head, new THREE.OctahedronGeometry(0.065), clip, s * 0.42, 0.18, -0.06, { outline: 0.15 });
    }
  },
};

function resolve(look: AvatarLook): ResolvedLook {
  return { ...look, eyes: look.outfit, trim: look.outfit === '#ff6fa8' ? '#ffd84d' : '#ff6fa8' };
}

export interface Pose {
  walking: boolean;
  seated: boolean;
  talking: boolean;
  happy: boolean;
}

const angleLerp = (a: number, b: number, t: number) => {
  const TAU = Math.PI * 2;
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * t;
};

/** A built character plus the parts its animation drives. */
export class CharacterRig {
  readonly group = new THREE.Group();
  readonly labelHeight = HEAD_Y + 0.85;
  yaw = 0;
  private body = new THREE.Group();
  private head = new THREE.Group();
  private hands: THREE.Mesh[] = [];
  private legs: THREE.Group[] = [];
  /** 0 = standing, 1 = seated; eased so sitting down looks smooth. */
  private sit = 0;
  private eyes: THREE.Group[] = [];
  private happyEyes: THREE.Mesh[] = [];
  private smile!: THREE.Mesh;
  private mouthOpen!: THREE.Mesh;
  private sway: THREE.Object3D[] = [];
  private phase = Math.random() * 10;
  private blinkIn = 1 + Math.random() * 3;

  constructor(lookInput: AvatarLook) {
    const look = resolve(lookInput);
    this.group.add(this.body);
    const skin = toon(SKIN);
    const hair = toon(look.hair);
    const outfit = toon(look.outfit);
    const trim = toon(look.trim);
    const b = this.body;

    // Sailor-style outfit
    mesh(b, new THREE.CylinderGeometry(0.15, 0.25, 0.24, 20), outfit, 0, 0.3, 0, { outline: 0.05 });
    mesh(b, new THREE.CapsuleGeometry(0.16, 0.14, 6, 16), toon('#ffffff'), 0, 0.5, 0, { outline: 0.05 });
    mesh(b, new THREE.CylinderGeometry(0.17, 0.23, 0.07, 20), outfit, 0, 0.63, -0.01, { outline: 0.05 });
    const tie = new THREE.Group();
    tie.position.set(0, 0.56, 0.16);
    b.add(tie);
    for (const s of [-1, 1]) {
      mesh(tie, new THREE.ConeGeometry(0.05, 0.1, 10), trim, s * 0.05, 0, 0, { outline: 0.1 }).rotation.z = (s * Math.PI) / 2;
      mesh(tie, new THREE.ConeGeometry(0.03, 0.1, 8), trim, s * 0.025, -0.06, 0).rotation.z = Math.PI + s * 0.3;
    }
    // Each leg hangs from a hip pivot so it can swing forward when seated
    this.legs = [-1, 1].map((s) => {
      const hip = new THREE.Group();
      hip.position.set(s * 0.08, HIP_Y, 0);
      b.add(hip);
      mesh(hip, new THREE.CapsuleGeometry(0.045, 0.08, 4, 8), skin, 0, -0.07, 0);
      mesh(hip, sphere(0.07), toon('#4a4560'), 0, -0.17, 0.03, { outline: 0.1 }).scale.set(1, 0.7, 1.35);
      return hip;
    });
    this.hands = [-1, 1].map((s) => mesh(b, sphere(0.06), skin, s * 0.23, 0.45, 0.05, { outline: 0.12 }));

    // Head and hair
    this.head.position.y = HEAD_Y;
    b.add(this.head);
    const h = this.head;
    mesh(h, sphere(R, 32, 24), skin, 0, 0, 0, { outline: 0.035 });
    mesh(h, new THREE.SphereGeometry(R + 0.035, 32, 16, 0, Math.PI * 2, 0, 1.25), hair, 0, 0, 0, { outline: 0.04 });
    mesh(h, new THREE.SphereGeometry(R + 0.05, 32, 16, Math.PI, Math.PI, 0, 2.35), hair, 0, 0, 0, { outline: 0.04 });
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.24;
      const edge = Math.abs(i) === 3;
      const y = edge ? 0.17 : 0.25 - Math.abs(i) * 0.012;
      const len = edge ? 0.36 : 0.24 + (i % 2 === 0 ? 0.03 : 0);
      const hr = Math.sqrt((R + 0.03) ** 2 - y ** 2) + 0.03;
      cone(h, 0.085, len, hair, Math.sin(a) * hr, y, Math.cos(a) * hr, Math.PI - 0.3, a, 0);
    }
    for (const s of [-1, 1]) this.sway.push(cone(h, 0.09, 0.5, hair, s * 0.4, -0.16, 0.14, Math.PI - 0.15, s * 0.5, -s * 0.08, 0.5));
    const shine = mesh(h, new THREE.TorusGeometry(0.405, 0.016, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 }), 0, 0.26, 0, flat);
    shine.rotation.x = Math.PI / 2;

    // Face
    this.eyes = [-1, 1].map((s) => buildEye(h, s, look.eyes));
    this.happyEyes = [-1, 1].map((s) => {
      const arc = mesh(h, new THREE.TorusGeometry(0.065, 0.018, 6, 14, Math.PI), toon(INK), s * 0.16, -0.05, 0.415, flat);
      arc.rotation.y = s * 0.38;
      arc.visible = false;
      return arc;
    });
    const blush = new THREE.MeshBasicMaterial({ color: '#ff8fab', transparent: true, opacity: 0.6 });
    const blushLine = toon('#ff5f86');
    for (const s of [-1, 1]) {
      const cheek = new THREE.Group();
      cheek.position.set(s * 0.26, -0.15, 0.33);
      cheek.rotation.y = s * 0.65;
      h.add(cheek);
      mesh(cheek, sphere(0.065, 12, 8), blush, 0, 0, 0, flat).scale.set(1.25, 0.6, 0.25);
      for (const dx of [-0.03, 0, 0.03]) mesh(cheek, new THREE.CapsuleGeometry(0.006, 0.035, 2, 4), blushLine, dx, 0, 0.02, flat).rotation.z = 0.5;
    }
    this.smile = mesh(h, new THREE.TorusGeometry(0.03, 0.009, 6, 12, Math.PI), toon(INK), 0, -0.18, 0.41, flat);
    this.smile.rotation.z = Math.PI;
    this.mouthOpen = mesh(h, sphere(0.04, 12, 8), toon('#c2415e'), 0, -0.19, 0.405, flat);
    this.mouthOpen.scale.set(1, 0.85, 0.4);
    this.mouthOpen.visible = false;

    ACCESSORIES[look.accessory]?.(h, look, this.sway);
    for (const part of this.sway) part.userData.base = part.rotation.clone();
  }

  /** Current extra height from sitting (for placing labels above the head). */
  get lift() {
    return this.sit * SIT_LIFT;
  }

  /** Advance animation. `targetYaw` is the facing angle to turn toward. */
  update(dt: number, t: number, targetYaw: number, pose: Pose) {
    this.yaw = angleLerp(this.yaw, targetYaw, Math.min(1, dt * 10));
    this.group.rotation.y = this.yaw;

    this.sit += ((pose.seated ? 1 : 0) - this.sit) * Math.min(1, dt * 8);
    const hop = pose.walking ? Math.abs(Math.sin(t * 10)) : 0;
    const breathe = Math.sin(t * 2.4 + this.phase) * 0.015;
    this.body.position.y = hop * 0.1 + this.sit * SIT_LIFT;
    // Seated: legs swing forward over the chair edge, feet dangling a little
    const swingLegs = pose.walking ? Math.sin(t * 10) * 0.35 : 0;
    this.legs.forEach((leg, i) => {
      leg.rotation.x = -1.3 * this.sit + (i === 0 ? swingLegs : -swingLegs) + Math.sin(t * 1.7 + this.phase + i) * 0.06 * this.sit;
    });
    this.body.scale.set(1 - hop * 0.03 + breathe, 1 + hop * 0.04 - breathe, 1);
    this.body.rotation.z = pose.walking ? Math.sin(t * 10) * 0.08 : 0;

    const [left, right] = this.hands as [THREE.Mesh, THREE.Mesh];
    if (pose.seated) {
      // Writing / turning pages at the table
      left.position.set(-0.14, 0.52 + Math.sin(t * 3) * 0.015, 0.22);
      right.position.set(0.14, 0.52 + Math.sin(t * 7 + 1) * 0.03, 0.24);
    } else if (pose.walking) {
      left.position.set(-0.23, 0.45, Math.sin(t * 10) * 0.1);
      right.position.set(0.23, 0.45, -Math.sin(t * 10) * 0.1);
    } else {
      left.position.set(-0.23, 0.45, 0.05);
      right.position.set(0.23, 0.45, 0.05);
    }

    this.head.rotation.x = pose.seated ? 0.22 + Math.sin(t * 1.3 + this.phase) * 0.03 : 0;
    this.head.rotation.z = pose.seated || pose.walking ? 0 : Math.sin(t * 0.9 + this.phase) * 0.1;

    this.blinkIn -= dt;
    if (this.blinkIn < -0.12) this.blinkIn = 2 + Math.random() * 3;
    const eyeY = this.blinkIn < 0 ? 0.12 : 1;
    this.eyes.forEach((eye, i) => {
      eye.scale.y = eyeY;
      eye.visible = !pose.happy;
      this.happyEyes[i]!.visible = pose.happy;
    });

    const talking = pose.talking && Math.sin(t * 16) > 0;
    this.mouthOpen.visible = talking;
    this.smile.visible = !talking;

    const swing = pose.walking ? Math.sin(t * 10) * 0.18 : Math.sin(t * 1.6 + this.phase) * 0.05;
    for (const part of this.sway) {
      const base = part.userData.base as THREE.Euler;
      part.rotation.x = base.x + swing * 0.6;
      part.rotation.z = base.z + swing * 0.5;
    }
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
