import * as THREE from 'three';
import type { AvatarLook, OutfitStyle } from '@connecta/shared';
import { show, skinCharacter } from './skin';

/*
 * Anime moe chibi characters, built from Three.js primitives.
 * Cel shading (3-step toon gradient) with inverted-hull ink outlines.
 * Built from parts for readability, then merged into a few skinned meshes (skin.ts) so a full room
 * stays cheap to draw.
 */

const HEAD_Y = 1.1;
/** Hip pivot height, and how far the body rises to rest on a chair seat (seat top ≈ 0.47 m). */
const HIP_Y = 0.22;
export const SIT_LIFT = 0.29;
/** On a floor cushion (seat.low): about the cushion's top, not a chair's. */
export const LOW_SIT_LIFT = 0.0;
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

function mesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  { shadow = false, outline = 0 }: MeshOpts = {}, // characters move; the room's shadow map is static
) {
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

const sphere = (r: number, w = 20, h = 14) => new THREE.SphereGeometry(r, q(w), q(h));

/**
 * Character detail: "low" (battery saver, phones) builds every round part with about half the
 * segments, roughly a third of the triangles. Outlines use the same shapes, so they still line up.
 */
export type CharacterDetail = 'full' | 'low';
let segments = 1;
const q = (n: number) => Math.max(3, Math.round(n * segments));
const flat = { shadow: false };

function cone(
  parent: THREE.Object3D,
  r: number,
  h: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  flatten = 0.55,
) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.set(rx, ry, rz, 'YXZ');
  parent.add(pivot);
  mesh(pivot, new THREE.ConeGeometry(r, h, q(10)), mat, 0, 0, 0, { outline: 0.06 }).scale.z = flatten;
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
  const lash = mesh(eye, new THREE.CapsuleGeometry(0.02, 0.15, q(4), q(8)), toon(INK), 0, 0.125, 0.01, flat);
  lash.rotation.z = Math.PI / 2 - side * 0.15;
  const flick = mesh(eye, new THREE.ConeGeometry(0.022, 0.07, q(6)), toon(INK), side * 0.1, 0.12, 0.01, flat);
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
      const loop = mesh(bow, new THREE.ConeGeometry(0.12, 0.22, q(16)), mat, s * 0.12, 0, 0, { outline: 0.08 });
      loop.rotation.z = (s * Math.PI) / 2;
      loop.scale.z = 0.5;
    }
    mesh(bow, sphere(0.05), mat, 0, 0, 0, { outline: 0.15 });
  },
  glasses(head) {
    const mat = toon('#3a3550');
    for (const s of [-1, 1]) {
      mesh(head, new THREE.TorusGeometry(0.115, 0.013, q(8), q(28)), mat, s * 0.16, -0.04, 0.44, flat).rotation.y = s * 0.38;
    }
    mesh(head, new THREE.CylinderGeometry(0.009, 0.009, 0.09, q(6)), mat, 0, -0.02, 0.46, flat).rotation.z = Math.PI / 2;
  },
  catEars(head, look) {
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.27, 0.38, -0.02);
      ear.rotation.z = -s * 0.45;
      head.add(ear);
      mesh(ear, new THREE.ConeGeometry(0.15, 0.28, q(16)), toon(look.hair), 0, 0, 0, { outline: 0.07 });
      mesh(ear, new THREE.ConeGeometry(0.085, 0.17, q(16)), toon('#ffb3c8'), 0, -0.02, 0.06).scale.z = 0.5;
    }
  },
  headphones(head, look) {
    mesh(head, new THREE.TorusGeometry(0.5, 0.038, q(10), q(32), Math.PI), toon('#3a3f52'), 0, 0.02, 0, { outline: 0.02 });
    for (const s of [-1, 1]) {
      mesh(head, new THREE.CylinderGeometry(0.12, 0.12, 0.1, q(20)), toon(look.outfit), s * 0.48, 0, 0, { outline: 0.08 }).rotation.z =
        Math.PI / 2;
    }
  },
  ahoge(head, look, sway) {
    const strand = mesh(head, new THREE.TorusGeometry(0.11, 0.024, q(8), q(20), Math.PI * 1.3), toon(look.hair), 0.02, 0.58, 0.02);
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
  // --- Shop accessories (spec 15): built from the same primitives, so they cost about what a free one does ---
  bunnyEars(head, _look, sway) {
    const fur = toon('#fff8f3');
    const inner = toon('#ffb3c8');
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.17, 0.5, -0.06);
      ear.rotation.set(-0.12, 0, -s * 0.18);
      head.add(ear);
      mesh(ear, new THREE.CapsuleGeometry(0.075, 0.34, q(4), q(12)), fur, 0, 0.2, 0, { outline: 0.07 }).scale.z = 0.6;
      mesh(ear, new THREE.CapsuleGeometry(0.04, 0.26, q(4), q(10)), inner, 0, 0.2, 0.035).scale.z = 0.4;
      // One ear flops a little
      if (s === 1) {
        ear.rotation.z -= 0.25;
        sway.push(ear);
      }
    }
  },
  bearEars(head, look) {
    const fur = toon(look.hair);
    const inner = toon('#f3c7b6');
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.3, 0.37, -0.02);
      ear.rotation.z = -s * 0.5;
      head.add(ear);
      mesh(ear, sphere(0.12, 16, 12), fur, 0, 0, 0, { outline: 0.08 }).scale.z = 0.6;
      mesh(ear, sphere(0.065, 12, 8), inner, 0, 0, 0.045).scale.z = 0.4;
    }
  },
  starClips(head) {
    const gold = toon('#ffd24d', { emissive: '#ffcf40', emissiveIntensity: 0.25 });
    for (const [s, y, z, r] of [
      [1, 0.24, 0.33, 0.2],
      [1, 0.1, 0.38, -0.3],
    ] as const) {
      const star = mesh(head, starGeometry(0.105, 0.045, 0.035), gold, s * 0.31, y, z, { outline: 0.12 });
      star.rotation.set(0, s * 0.62, r);
    }
  },
  flowerCrown(head) {
    const crown = new THREE.Group();
    // Sits on the hair, tipped back a little, so the flowers in front show over the fringe
    crown.position.set(0, 0.33, -0.04);
    crown.rotation.x = -0.3;
    head.add(crown);
    mesh(crown, new THREE.TorusGeometry(0.43, 0.022, q(6), q(36)), toon('#6fbf73'), 0, 0, 0, flat).rotation.x = Math.PI / 2;
    const petals = ['#ff9ec4', '#ffffff', '#ffd76a', '#c9a7ff'];
    const centre = toon('#ffcf40');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const f = new THREE.Group();
      f.position.set(Math.sin(a) * 0.43, 0.02, Math.cos(a) * 0.43);
      f.rotation.y = a;
      crown.add(f);
      const petal = toon(petals[i % petals.length]!);
      // Four low-poly petals: eight flowers stay cheap on every head in the room
      for (let k = 0; k < 4; k++) {
        const b = (k / 4) * Math.PI * 2 + Math.PI / 4;
        mesh(f, sphere(0.055, 6, 4), petal, Math.cos(b) * 0.055, Math.sin(b) * 0.055, 0.01, flat).scale.z = 0.5;
      }
      mesh(f, sphere(0.034, 6, 4), centre, 0, 0, 0.03, flat);
    }
  },
  halo(head, _look, sway) {
    const ring = mesh(
      head,
      new THREE.TorusGeometry(0.26, 0.032, q(8), q(32)),
      toon('#ffe48a', { emissive: '#ffd84d', emissiveIntensity: 0.7 }),
      0,
      0.72,
      -0.04,
      { outline: 0.08 },
    );
    ring.rotation.x = Math.PI / 2 - 0.25;
    sway.push(ring);
  },
  witchHat(head, look) {
    const felt = toon('#4b3a6b');
    const hat = new THREE.Group();
    hat.position.set(0, 0.36, -0.03);
    hat.rotation.set(-0.12, 0, 0.12);
    head.add(hat);
    mesh(hat, new THREE.CylinderGeometry(0.62, 0.64, 0.035, q(32)), felt, 0, 0, 0, { outline: 0.03 });
    mesh(hat, new THREE.CylinderGeometry(0.33, 0.37, 0.09, q(24)), toon(look.trim), 0, 0.06, 0, { outline: 0.04 });
    mesh(hat, new THREE.ConeGeometry(0.33, 0.42, q(24)), felt, 0, 0.3, 0, { outline: 0.04 });
    // The bent tip
    const tip = mesh(hat, new THREE.ConeGeometry(0.13, 0.28, q(14)), felt, 0.08, 0.56, -0.04, { outline: 0.06 });
    tip.rotation.set(-0.4, 0, -0.9);
    mesh(hat, new THREE.OctahedronGeometry(0.05), toon('#ffd24d', { emissive: '#ffcf40', emissiveIntensity: 0.3 }), 0.22, 0.12, 0.26, flat);
  },
};

/** A five-pointed star, extruded a little, for the star clips */
function starGeometry(outer: number, inner: number, depth: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}

interface OutfitMats {
  outfit: THREE.Material;
  trim: THREE.Material;
}
/** What an outfit changes below it: the shoes (the raincoat's boots take the outfit colour) */
interface OutfitFeet {
  shoe?: THREE.Material;
  boots?: boolean;
  /** Trouser legs: short tubes on each leg, so they swing with it */
  cuffs?: THREE.Material;
}
type Outfit = (b: THREE.Object3D, look: ResolvedLook, m: OutfitMats) => OutfitFeet | void;

const WHITE = '#ffffff';
const darker = (c: string, k = 0.75) => new THREE.Color(c).multiplyScalar(k);

/** The outfit shapes: the sailor top is free; the rest come from the Shop (spec 15). */
const OUTFITS: Record<OutfitStyle, Outfit> = {
  sailor(b, _look, { outfit, trim }) {
    mesh(b, new THREE.CylinderGeometry(0.15, 0.25, 0.24, q(20)), outfit, 0, 0.3, 0, { outline: 0.05 });
    mesh(b, new THREE.CapsuleGeometry(0.16, 0.14, q(6), q(16)), toon(WHITE), 0, 0.5, 0, { outline: 0.05 });
    mesh(b, new THREE.CylinderGeometry(0.17, 0.23, 0.07, q(20)), outfit, 0, 0.63, -0.01, { outline: 0.05 });
    const tie = new THREE.Group();
    tie.position.set(0, 0.56, 0.16);
    b.add(tie);
    for (const s of [-1, 1]) {
      mesh(tie, new THREE.ConeGeometry(0.05, 0.1, q(10)), trim, s * 0.05, 0, 0, { outline: 0.1 }).rotation.z = (s * Math.PI) / 2;
      mesh(tie, new THREE.ConeGeometry(0.03, 0.1, q(8)), trim, s * 0.025, -0.06, 0).rotation.z = Math.PI + s * 0.3;
    }
  },
  hoodie(b, look, { outfit }) {
    // Shorts, then a roomy top with a band at the hem
    mesh(b, new THREE.CylinderGeometry(0.16, 0.2, 0.14, q(20)), toon('#4a4560'), 0, 0.27, 0, { outline: 0.05 });
    mesh(b, new THREE.CapsuleGeometry(0.19, 0.18, q(6), q(16)), outfit, 0, 0.47, 0, { outline: 0.05 });
    mesh(b, new THREE.CylinderGeometry(0.2, 0.2, 0.05, q(20)), toon(darker(look.outfit)), 0, 0.33, 0, flat);
    // The hood, resting behind the neck
    const hood = mesh(b, sphere(0.2, 16, 12), toon(darker(look.outfit, 0.88)), 0, 0.64, -0.13, { outline: 0.05 });
    hood.scale.set(1.15, 0.75, 0.7);
    // Pocket and drawstrings
    mesh(b, new THREE.BoxGeometry(0.2, 0.08, 0.04), toon(darker(look.outfit, 0.85)), 0, 0.42, 0.19, flat);
    for (const s of [-1, 1]) mesh(b, new THREE.CapsuleGeometry(0.008, 0.08, q(2), q(4)), toon(WHITE), s * 0.05, 0.58, 0.19, flat);
  },
  overalls(b, look, { outfit }) {
    // A white tee under a bib and trousers in the outfit colour
    mesh(b, new THREE.CapsuleGeometry(0.17, 0.16, q(6), q(16)), toon(WHITE), 0, 0.5, 0, { outline: 0.05 });
    // Short tee sleeves
    for (const s of [-1, 1]) mesh(b, sphere(0.075, 12, 8), toon(WHITE), s * 0.18, 0.58, 0, { outline: 0.08 });
    mesh(b, new THREE.CylinderGeometry(0.18, 0.2, 0.18, q(20)), outfit, 0, 0.3, 0, { outline: 0.05 });
    mesh(b, new THREE.BoxGeometry(0.24, 0.2, 0.05), outfit, 0, 0.46, 0.15, { outline: 0.06 });
    const gold = toon('#ffd24d');
    for (const s of [-1, 1]) {
      const strap = mesh(b, new THREE.BoxGeometry(0.045, 0.24, 0.03), outfit, s * 0.08, 0.58, 0.05, flat);
      strap.rotation.x = 0.35;
      mesh(b, new THREE.CylinderGeometry(0.022, 0.022, 0.015, q(10)), gold, s * 0.07, 0.54, 0.18, flat).rotation.x = Math.PI / 2;
    }
    mesh(b, new THREE.BoxGeometry(0.09, 0.06, 0.02), toon(darker(look.outfit)), 0, 0.44, 0.18, flat);
    return { cuffs: outfit };
  },
  raincoat(b, look, { outfit }) {
    // A long flared coat with toggles, a hood behind and boots to match
    mesh(b, new THREE.CylinderGeometry(0.18, 0.27, 0.42, q(20)), outfit, 0, 0.42, 0, { outline: 0.05 });
    mesh(b, new THREE.CylinderGeometry(0.17, 0.2, 0.06, q(20)), toon(darker(look.outfit)), 0, 0.64, 0, flat);
    const hood = mesh(b, sphere(0.21, 16, 12), outfit, 0, 0.66, -0.13, { outline: 0.05 });
    hood.scale.set(1.15, 0.8, 0.75);
    const toggle = toon(WHITE);
    for (const y of [0.52, 0.42, 0.32])
      mesh(b, new THREE.CapsuleGeometry(0.012, 0.045, q(2), q(6)), toggle, 0, y, 0.215 + (0.52 - y) * 0.15, flat).rotation.z = Math.PI / 2;
    return { shoe: toon(look.outfit), boots: true };
  },
  yukata(b, look, { outfit, trim }) {
    // A wrapped robe, a sash with a bow at the back, and a white collar crossing in front
    mesh(b, new THREE.CylinderGeometry(0.17, 0.25, 0.44, q(20)), outfit, 0, 0.42, 0, { outline: 0.05 });
    mesh(b, new THREE.CylinderGeometry(0.19, 0.2, 0.08, q(20)), trim, 0, 0.44, 0, { outline: 0.05 });
    // Wide sleeves hanging behind the hands
    for (const s of [-1, 1]) {
      const sleeve = mesh(b, new THREE.BoxGeometry(0.1, 0.2, 0.15), outfit, s * 0.22, 0.48, -0.02, { outline: 0.06 });
      sleeve.rotation.z = s * 0.12;
    }
    const bow = new THREE.Group();
    bow.position.set(0, 0.45, -0.2);
    b.add(bow);
    for (const s of [-1, 1]) {
      const loop = mesh(bow, new THREE.ConeGeometry(0.07, 0.15, q(12)), trim, s * 0.08, 0, 0, { outline: 0.08 });
      loop.rotation.z = (s * Math.PI) / 2;
      loop.scale.z = 0.5;
    }
    const collar = toon(WHITE);
    for (const s of [-1, 1]) {
      const band = mesh(b, new THREE.BoxGeometry(0.035, 0.2, 0.02), collar, s * 0.04, 0.57, 0.17, flat);
      band.rotation.set(0.15, 0, s * 0.55);
    }
    // A few white dots for the print
    const dot = toon(darker(look.outfit, 1.6));
    for (const [x, y] of [
      [-0.12, 0.3],
      [0.1, 0.27],
      [0.15, 0.36],
      [-0.06, 0.24],
    ] as const) {
      const a = Math.atan2(x, 0.25);
      mesh(b, sphere(0.022, 8, 6), dot, x, y, Math.cos(a) * 0.23, flat).scale.z = 0.4;
    }
  },
};

function resolve(look: AvatarLook): ResolvedLook {
  return { ...look, eyes: look.outfit, trim: look.outfit === '#ff6fa8' ? '#ffd84d' : '#ff6fa8' };
}

export interface Pose {
  walking: boolean;
  seated: boolean;
  /** Seated on a floor cushion. */
  low?: boolean;
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
  private skinned: THREE.SkinnedMesh[] = [];

  constructor(lookInput: AvatarLook, detail: CharacterDetail = 'full') {
    // Read by the shape helpers while this constructor builds (construction is synchronous)
    segments = detail === 'low' ? 0.5 : 1;
    const look = resolve(lookInput);
    this.group.add(this.body);
    const skin = toon(SKIN);
    const hair = toon(look.hair);
    const outfit = toon(look.outfit);
    const trim = toon(look.trim);
    const b = this.body;

    const feet = OUTFITS[look.style ?? 'sailor'](b, look, { outfit, trim }) ?? {};
    const shoe = feet.shoe ?? toon('#4a4560');
    // Each leg hangs from a hip pivot so it can swing forward when seated
    this.legs = [-1, 1].map((s) => {
      const hip = new THREE.Group();
      hip.position.set(s * 0.08, HIP_Y, 0);
      b.add(hip);
      mesh(hip, new THREE.CapsuleGeometry(0.045, 0.08, q(4), q(8)), skin, 0, -0.07, 0);
      mesh(hip, sphere(0.07), shoe, 0, -0.17, 0.03, { outline: 0.1 }).scale.set(1, 0.7, 1.35);
      if (feet.cuffs) mesh(hip, new THREE.CylinderGeometry(0.065, 0.07, 0.1, q(12)), feet.cuffs, 0, -0.06, 0, { outline: 0.06 });
      // Boots come up the leg a little
      if (feet.boots) mesh(hip, new THREE.CylinderGeometry(0.06, 0.065, 0.09, q(12)), shoe, 0, -0.12, 0, { outline: 0.08 });
      return hip;
    });
    this.hands = [-1, 1].map((s) => mesh(b, sphere(0.06), skin, s * 0.23, 0.45, 0.05, { outline: 0.12 }));

    // Head and hair
    this.head.position.y = HEAD_Y;
    b.add(this.head);
    const h = this.head;
    mesh(h, sphere(R, 32, 24), skin, 0, 0, 0, { outline: 0.035 });
    mesh(h, new THREE.SphereGeometry(R + 0.035, q(32), q(16), 0, Math.PI * 2, 0, 1.25), hair, 0, 0, 0, { outline: 0.04 });
    mesh(h, new THREE.SphereGeometry(R + 0.05, q(32), q(16), Math.PI, Math.PI, 0, 2.35), hair, 0, 0, 0, { outline: 0.04 });
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.24;
      const edge = Math.abs(i) === 3;
      const y = edge ? 0.17 : 0.25 - Math.abs(i) * 0.012;
      const len = edge ? 0.36 : 0.24 + (i % 2 === 0 ? 0.03 : 0);
      const hr = Math.sqrt((R + 0.03) ** 2 - y ** 2) + 0.03;
      cone(h, 0.085, len, hair, Math.sin(a) * hr, y, Math.cos(a) * hr, Math.PI - 0.3, a, 0);
    }
    for (const s of [-1, 1]) this.sway.push(cone(h, 0.09, 0.5, hair, s * 0.4, -0.16, 0.14, Math.PI - 0.15, s * 0.5, -s * 0.08, 0.5));
    const shine = mesh(
      h,
      new THREE.TorusGeometry(0.405, 0.016, q(6), q(40)),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 }),
      0,
      0.26,
      0,
      flat,
    );
    shine.rotation.x = Math.PI / 2;

    // Face
    this.eyes = [-1, 1].map((s) => buildEye(h, s, look.eyes));
    this.happyEyes = [-1, 1].map((s) => {
      const arc = mesh(h, new THREE.TorusGeometry(0.065, 0.018, q(6), q(14), Math.PI), toon(INK), s * 0.16, -0.05, 0.415, flat);
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
      for (const dx of [-0.03, 0, 0.03])
        mesh(cheek, new THREE.CapsuleGeometry(0.006, 0.035, q(2), q(4)), blushLine, dx, 0, 0.02, flat).rotation.z = 0.5;
    }
    this.smile = mesh(h, new THREE.TorusGeometry(0.03, 0.009, q(6), q(12), Math.PI), toon(INK), 0, -0.18, 0.41, flat);
    this.smile.rotation.z = Math.PI;
    this.mouthOpen = mesh(h, sphere(0.04, 12, 8), toon('#c2415e'), 0, -0.19, 0.405, flat);
    this.mouthOpen.scale.set(1, 0.85, 0.4);
    this.mouthOpen.visible = false;

    ACCESSORIES[look.accessory]?.(h, look, this.sway);
    for (const part of this.sway) part.userData.base = part.rotation.clone();

    this.skinned = skinCharacter(
      this.group,
      [this.body, ...this.legs, ...this.hands, this.head, ...this.eyes, ...this.happyEyes, this.smile, this.mouthOpen, ...this.sway],
      getGradientMap(),
      OUTLINE,
    );
    this.happyEyes.forEach((e) => show(e, false));
    show(this.mouthOpen, false);
  }

  /** How high the current (or last) seat holds you; kept while you stand, so standing up eases down from it. */
  private seatLift = SIT_LIFT;

  /** Current extra height from sitting (for placing labels above the head). */
  get lift() {
    return this.sit * this.seatLift;
  }

  /** Advance animation. `targetYaw` is the facing angle to turn toward. */
  update(dt: number, t: number, targetYaw: number, pose: Pose) {
    this.yaw = angleLerp(this.yaw, targetYaw, Math.min(1, dt * 10));
    this.group.rotation.y = this.yaw;

    this.sit += ((pose.seated ? 1 : 0) - this.sit) * Math.min(1, dt * 8);
    if (pose.seated) this.seatLift = pose.low ? LOW_SIT_LIFT : SIT_LIFT;
    const hop = pose.walking ? Math.abs(Math.sin(t * 10)) : 0;
    const breathe = Math.sin(t * 2.4 + this.phase) * 0.015;
    this.body.position.y = hop * 0.1 + this.sit * this.seatLift;
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
      show(eye, !pose.happy, eyeY);
      show(this.happyEyes[i]!, pose.happy);
    });

    const talking = pose.talking && Math.sin(t * 16) > 0;
    show(this.mouthOpen, talking);
    show(this.smile, !talking);

    const swing = pose.walking ? Math.sin(t * 10) * 0.18 : Math.sin(t * 1.6 + this.phase) * 0.05;
    for (const part of this.sway) {
      const base = part.userData.base as THREE.Euler;
      part.rotation.x = base.x + swing * 0.6;
      part.rotation.z = base.z + swing * 0.5;
    }
  }

  /** The merged meshes' geometry is this character's own; the materials are shared by everyone. */
  dispose() {
    for (const m of this.skinned) {
      m.geometry.dispose();
      m.skeleton.dispose();
    }
  }
}
