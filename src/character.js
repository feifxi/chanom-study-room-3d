import * as THREE from 'three';

// Chibi proportions: a big head on a tiny body. Head center sits at HEAD_Y.
const HEAD_Y = 1.1;
const R = 0.44;

const SKIN = '#ffe6da';
const INK = '#2b2140';

// Three-step gradient gives the flat, banded shading of anime cel art.
const gradientMap = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const OUTLINE = new THREE.MeshBasicMaterial({ color: '#3a2a40', side: THREE.BackSide });

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...opts });
}

// `outline` > 0 adds an inverted-hull ink line, scaled by that fraction.
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, { shadow = true, outline = 0 } = {}) {
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

const sphere = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const noShadow = { shadow: false };

// Big layered anime eye: dark base, two-tone iris, lash line and sparkles.
function buildEye(head, side, irisColor) {
  const eye = new THREE.Group();
  eye.position.set(side * 0.16, -0.04, 0.4);
  eye.rotation.y = side * 0.38;
  head.add(eye);

  const iris = new THREE.Color(irisColor);
  const light = iris.clone().lerp(new THREE.Color('#ffffff'), 0.55);
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  mesh(eye, sphere(0.1), toon(INK), 0, 0, 0, noShadow).scale.set(0.8, 1.3, 0.3);
  mesh(eye, sphere(0.08), toon(iris), 0, -0.02, 0.01, noShadow).scale.set(0.75, 1.05, 0.3);
  mesh(eye, sphere(0.05), new THREE.MeshBasicMaterial({ color: light }), 0, -0.065, 0.018, noShadow).scale.set(0.85, 0.55, 0.3);
  mesh(eye, sphere(0.034, 10, 8), white, -side * 0.03, 0.05, 0.032, noShadow);
  mesh(eye, sphere(0.016, 8, 6), white, side * 0.03, -0.06, 0.032, noShadow);

  // Thick upper lash with a flick at the outer corner
  const lash = mesh(eye, new THREE.CapsuleGeometry(0.02, 0.15, 4, 8), toon(INK), 0, 0.125, 0.01, noShadow);
  lash.rotation.z = Math.PI / 2 - side * 0.15;
  const flick = mesh(eye, new THREE.ConeGeometry(0.022, 0.07, 6), toon(INK), side * 0.1, 0.12, 0.01, noShadow);
  flick.rotation.z = -side * 1.1;
  return eye;
}

// "^ ^" closed happy eye
function buildHappyEye(head, side) {
  const arc = mesh(head, new THREE.TorusGeometry(0.065, 0.018, 6, 14, Math.PI), toon(INK), side * 0.16, -0.05, 0.415, noShadow);
  arc.rotation.y = side * 0.38;
  arc.visible = false;
  return arc;
}

function cone(parent, r, h, mat, x, y, z, rx, ry, rz, flatten = 0.55, outline = 0.06) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.set(rx, ry, rz, 'YXZ');
  parent.add(pivot);
  const c = mesh(pivot, new THREE.ConeGeometry(r, h, 10), mat, 0, 0, 0, { outline });
  c.scale.z = flatten;
  return pivot;
}

const ACCESSORIES = {
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
      const rim = mesh(head, new THREE.TorusGeometry(0.115, 0.013, 8, 28), mat, s * 0.16, -0.04, 0.44, noShadow);
      rim.rotation.y = s * 0.38;
    }
    mesh(head, new THREE.CylinderGeometry(0.009, 0.009, 0.09, 6), mat, 0, -0.02, 0.46, noShadow).rotation.z = Math.PI / 2;
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

  headphones(head, look, roleColor) {
    mesh(head, new THREE.TorusGeometry(0.5, 0.038, 10, 32, Math.PI), toon('#3a3f52'), 0, 0.02, 0, { outline: 0.02 });
    for (const s of [-1, 1]) {
      const cup = mesh(head, new THREE.CylinderGeometry(0.12, 0.12, 0.1, 20), toon(roleColor), s * 0.48, 0, 0, { outline: 0.08 });
      cup.rotation.z = Math.PI / 2;
    }
  },

  // A single springy hair strand on top
  ahoge(head, look, roleColor, sway) {
    const strand = mesh(head, new THREE.TorusGeometry(0.11, 0.024, 8, 20, Math.PI * 1.3), toon(look.hair), 0.02, 0.58, 0.02);
    strand.rotation.set(0, Math.PI / 2, 0.4);
    sway.push(strand);
  },

  twintails(head, look, roleColor, sway) {
    const hair = toon(look.hair);
    const clip = toon(look.trim, { emissive: look.trim, emissiveIntensity: 0.3 });
    for (const s of [-1, 1]) {
      const tail = cone(head, 0.14, 0.62, hair, s * 0.5, -0.12, -0.12, 0, 0, Math.PI - s * 0.3, 0.7);
      sway.push(tail);
      mesh(head, new THREE.OctahedronGeometry(0.065), clip, s * 0.42, 0.18, -0.06, { outline: 0.15 });
    }
  },
};

/**
 * Builds a chibi anime character. Returns the animated parts so Agent can drive them.
 */
export function buildCharacter(parent, { color, look }) {
  const roleColor = new THREE.Color(color);
  const skin = toon(SKIN);
  const hair = toon(look.hair);
  const outfit = toon(roleColor);
  const white = toon('#ffffff');
  const trim = toon(look.trim ?? '#ff5d7a');
  const sway = [];

  // Sailor-style outfit: white top, role-coloured collar and bottom, ribbon tie
  mesh(parent, new THREE.CylinderGeometry(0.15, 0.25, 0.24, 20), outfit, 0, 0.3, 0, { outline: 0.05 });
  mesh(parent, new THREE.CapsuleGeometry(0.16, 0.14, 6, 16), white, 0, 0.5, 0, { outline: 0.05 });
  mesh(parent, new THREE.CylinderGeometry(0.17, 0.23, 0.07, 20), outfit, 0, 0.63, -0.01, { outline: 0.05 });
  const tie = new THREE.Group();
  tie.position.set(0, 0.56, 0.16);
  parent.add(tie);
  for (const s of [-1, 1]) {
    const loop = mesh(tie, new THREE.ConeGeometry(0.05, 0.1, 10), trim, s * 0.05, 0, 0, { outline: 0.1 });
    loop.rotation.z = (s * Math.PI) / 2;
  }
  for (const s of [-1, 1]) {
    const tail = mesh(tie, new THREE.ConeGeometry(0.03, 0.1, 8), trim, s * 0.025, -0.06, 0);
    tail.rotation.z = Math.PI + s * 0.3;
  }

  for (const s of [-1, 1]) {
    mesh(parent, new THREE.CapsuleGeometry(0.045, 0.08, 4, 8), skin, s * 0.08, 0.15, 0);
    mesh(parent, sphere(0.07), toon('#4a4560'), s * 0.08, 0.05, 0.03, { outline: 0.1 }).scale.set(1, 0.7, 1.35);
  }
  const hands = [-1, 1].map((s) => mesh(parent, sphere(0.06), skin, s * 0.23, 0.45, 0.05, { outline: 0.12 }));

  // Head
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  parent.add(head);
  mesh(head, sphere(R, 32, 24), skin, 0, 0, 0, { outline: 0.035 });

  // Hair: top cap, fuller back, spiky bangs, long side locks and a shine ring
  mesh(head, new THREE.SphereGeometry(R + 0.035, 32, 16, 0, Math.PI * 2, 0, 1.25), hair, 0, 0, 0, { outline: 0.04 });
  mesh(head, new THREE.SphereGeometry(R + 0.05, 32, 16, Math.PI, Math.PI, 0, 2.35), hair, 0, 0, 0, { outline: 0.04 });
  for (let i = -3; i <= 3; i++) {
    const a = i * 0.24;
    const edge = Math.abs(i) === 3;
    const y = edge ? 0.17 : 0.25 - Math.abs(i) * 0.012;
    const len = edge ? 0.36 : 0.24 + (i % 2 === 0 ? 0.03 : 0);
    const hr = Math.sqrt((R + 0.03) ** 2 - y ** 2) + 0.03;
    cone(head, 0.085, len, hair, Math.sin(a) * hr, y, Math.cos(a) * hr, Math.PI - 0.3, a, 0);
  }
  for (const s of [-1, 1]) {
    sway.push(cone(head, 0.09, 0.5, hair, s * 0.4, -0.16, 0.14, Math.PI - 0.15, s * 0.5, -s * 0.08, 0.5));
  }
  mesh(head, new THREE.TorusGeometry(0.405, 0.016, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 }), 0, 0.26, 0, noShadow).rotation.x = Math.PI / 2;

  // Face
  const eyes = [-1, 1].map((s) => buildEye(head, s, look.eyes));
  const happyEyes = [-1, 1].map((s) => buildHappyEye(head, s));

  const blush = new THREE.MeshBasicMaterial({ color: '#ff8fab', transparent: true, opacity: 0.6 });
  const blushLine = toon('#ff5f86');
  for (const s of [-1, 1]) {
    const cheek = new THREE.Group();
    cheek.position.set(s * 0.26, -0.15, 0.33);
    cheek.rotation.y = s * 0.65;
    head.add(cheek);
    mesh(cheek, sphere(0.065, 12, 8), blush, 0, 0, 0, noShadow).scale.set(1.25, 0.6, 0.25);
    for (const dx of [-0.03, 0, 0.03]) {
      mesh(cheek, new THREE.CapsuleGeometry(0.006, 0.035, 2, 4), blushLine, dx, 0, 0.02, noShadow).rotation.z = 0.5;
    }
  }

  const smile = mesh(head, new THREE.TorusGeometry(0.03, 0.009, 6, 12, Math.PI), toon(INK), 0, -0.18, 0.41, noShadow);
  smile.rotation.z = Math.PI;
  const mouthOpen = mesh(head, sphere(0.04, 12, 8), toon('#c2415e'), 0, -0.19, 0.405, noShadow);
  mouthOpen.scale.set(1, 0.85, 0.4);
  mouthOpen.visible = false;

  ACCESSORIES[look.accessory]?.(head, look, roleColor, sway);
  for (const part of sway) part.userData.base = part.rotation.clone();

  return { head, hands, eyes, happyEyes, smile, mouthOpen, sway, labelY: HEAD_Y + 0.85 };
}
