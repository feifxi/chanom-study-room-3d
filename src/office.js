import * as THREE from 'three';

const DESK_XS = [-6.5, -2.5, 1.5];
const MEETING = new THREE.Vector3(7.4, 0, 0);
const SEAT_COUNT = 6;

const v = (x, z) => new THREE.Vector3(x, 0, z);
const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
}

const M = {
  floor: std('#eadfcd'),
  wall: std('#f6f2ec'),
  trim: std('#ddd2c1'),
  wood: std('#c99c70'),
  woodDark: std('#9d7352'),
  metal: std('#3b3f4a', { roughness: 0.4, metalness: 0.5 }),
  dark: std('#23262e', { roughness: 0.5 }),
  white: std('#fbfbfb'),
  grey: std('#cfd4dc'),
  leaf: std('#5fa36a', { flatShading: true }),
  leafDark: std('#3f8a55', { flatShading: true }),
  pot: std('#d9805c'),
  rug: std('#dfe5f2'),
  sofa: std('#6f80d6'),
  cushion: std('#f2c46d'),
  glass: new THREE.MeshBasicMaterial({ color: '#cfe6fb' }),
};

function add(parent, geo, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

function plant(scene, x, z, s = 1) {
  add(scene, C(0.28 * s, 0.22 * s, 0.5 * s), M.pot, x, 0.25 * s, z);
  add(scene, new THREE.IcosahedronGeometry(0.5 * s, 0), M.leaf, x, 0.85 * s, z);
  add(scene, new THREE.IcosahedronGeometry(0.35 * s, 0), M.leafDark, x + 0.15 * s, 1.25 * s, z - 0.1 * s);
}

function buildDesk(scene, i) {
  const row = i < 3 ? -1 : 1; // -1 = back row, +1 = front row
  const x = DESK_XS[i % 3];
  const deskZ = row * 3.4;
  const seatZ = row * 2.3;
  const accessZ = row * 1.0;
  const towardSeat = -row; // direction from desk toward its seat / the aisle

  add(scene, B(1.8, 0.08, 0.9), M.wood, x, 0.75, deskZ);
  for (const sx of [-0.82, 0.82]) {
    for (const sz of [-0.38, 0.38]) add(scene, B(0.06, 0.72, 0.06), M.metal, x + sx, 0.36, deskZ + sz);
  }

  // Monitor sits on the far edge, screen facing the seat
  const monZ = deskZ - towardSeat * 0.22;
  add(scene, B(0.08, 0.3, 0.08), M.dark, x, 0.94, monZ);
  add(scene, B(0.92, 0.57, 0.05), M.dark, x, 1.3, monZ);
  const screenMat = std('#0b0d14', { roughness: 0.3, emissive: '#10131c' });
  const screen = add(scene, new THREE.PlaneGeometry(0.84, 0.49), screenMat, x, 1.3, monZ + towardSeat * 0.03, { cast: false });
  if (row === 1) screen.rotation.y = Math.PI;

  add(scene, B(0.6, 0.03, 0.2), M.grey, x - 0.1, 0.8, deskZ + towardSeat * 0.18);
  add(scene, C(0.06, 0.05, 0.12, 12), M.white, x + 0.6, 0.85, deskZ + towardSeat * 0.1);
  if (i % 2 === 0) plant(scene, x - 0.65, deskZ - towardSeat * 0.2, 0.35);

  const seat = {
    id: `desk${i}`, kind: 'desk',
    spot: v(x, seatZ),
    approach: [v(x, accessZ), v(x, seatZ)],
    face: row === -1 ? Math.PI : 0,
  };
  const visitSpot = v(x + 1.05, row * 1.95);
  const visit = {
    id: `visit${i}`, kind: 'visit',
    spot: visitSpot,
    approach: [v(x + 1.05, accessZ), visitSpot],
    face: faceTo(visitSpot, seat.spot),
  };

  return {
    seat,
    visit,
    obstacle: { minX: x - 0.92, maxX: x + 0.92, minZ: deskZ - 0.47, maxZ: deskZ + 0.47 },
    setScreen(color, t) {
      if (color) {
        screenMat.emissive.set(color);
        screenMat.emissiveIntensity = 0.6 + Math.sin(t * 9 + i) * 0.1;
      } else {
        screenMat.emissive.set('#10131c');
        screenMat.emissiveIntensity = 1;
      }
    },
  };
}

function meetingSeats() {
  const ring = (r, a) => v(MEETING.x + Math.cos(a) * r, MEETING.z + Math.sin(a) * r);
  const seats = [];
  for (let k = 0; k < SEAT_COUNT; k++) {
    const angle = Math.PI + (k * Math.PI * 2) / SEAT_COUNT;
    let delta = angle - Math.PI;
    if (delta > Math.PI) delta -= Math.PI * 2;
    // Walk around the outside of the circle so nobody cuts through the table
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.3));
    const approach = [ring(2.5, Math.PI)];
    for (let s = 1; s <= steps && delta !== 0; s++) approach.push(ring(2.5, Math.PI + (delta * s) / steps));
    const spot = ring(1.75, angle);
    approach.push(spot);
    seats.push({ id: `meet${k}`, kind: 'meeting', spot, approach, face: faceTo(spot, MEETING) });
  }
  return seats;
}

export function buildOffice(scene) {
  // Footprints the player can't walk through: boxes {minX,maxX,minZ,maxZ} or circles {x,z,r}
  const obstacles = [];

  // Lights
  scene.add(new THREE.HemisphereLight('#ffffff', '#cbb89d', 1.5));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.position.set(10, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun);

  // Shell
  add(scene, B(22, 0.4, 14), M.floor, 0, -0.2, 0, { cast: false });
  add(scene, B(22.4, 4, 0.2), M.wall, 0, 2, -7.1);
  add(scene, B(0.2, 4, 14), M.wall, -11.1, 2, 0);
  add(scene, B(22, 0.15, 0.05), M.trim, 0, 0.075, -6.98);
  add(scene, B(0.05, 0.15, 14), M.trim, -10.98, 0.075, 0);

  for (const x of [5, 8.6]) {
    add(scene, B(2.8, 2.1, 0.06), M.white, x, 2.3, -6.99);
    add(scene, new THREE.PlaneGeometry(2.6, 1.9), M.glass, x, 2.3, -6.95, { cast: false });
    add(scene, B(0.05, 1.9, 0.04), M.white, x, 2.3, -6.93);
  }
  for (const z of [-4.2, 4.2]) {
    add(scene, B(0.06, 2.1, 2.8), M.white, -10.99, 2.3, z);
    const g = add(scene, new THREE.PlaneGeometry(2.6, 1.9), M.glass, -10.95, 2.3, z, { cast: false });
    g.rotation.y = Math.PI / 2;
  }

  // Whiteboard with a live sprint board drawn onto a canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 400;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  add(scene, B(6.6, 2.7, 0.08), M.grey, -2.5, 2.25, -6.96);
  add(scene, new THREE.PlaneGeometry(6.4, 2.5), new THREE.MeshBasicMaterial({ map: texture }), -2.5, 2.25, -6.91, { cast: false });
  add(scene, B(2, 0.06, 0.15), M.grey, -2.5, 0.88, -6.86);

  // Desks
  const desks = Array.from({ length: 6 }, (_, i) => buildDesk(scene, i));
  obstacles.push(...desks.map((d) => d.obstacle));

  // Meeting area
  add(scene, C(3.1, 3.1, 0.02, 48), M.rug, MEETING.x, 0.01, MEETING.z, { cast: false });
  add(scene, C(1.15, 1.15, 0.08, 40), M.wood, MEETING.x, 0.78, MEETING.z);
  obstacles.push({ x: MEETING.x, z: MEETING.z, r: 1.2 });
  add(scene, C(0.12, 0.12, 0.75, 12), M.metal, MEETING.x, 0.38, MEETING.z);
  add(scene, C(0.5, 0.5, 0.04, 24), M.metal, MEETING.x, 0.02, MEETING.z);
  add(scene, B(0.5, 0.03, 0.35), M.dark, MEETING.x - 0.2, 0.84, MEETING.z + 0.1);
  add(scene, C(0.06, 0.05, 0.12, 12), M.white, MEETING.x + 0.4, 0.88, MEETING.z - 0.3);

  // Coffee corner
  add(scene, B(0.8, 0.95, 3.2), M.woodDark, -10.55, 0.475, 0);
  obstacles.push({ minX: -11, maxX: -10.15, minZ: -1.6, maxZ: 1.6 });
  add(scene, B(0.82, 0.05, 3.25), M.white, -10.55, 0.97, 0);
  add(scene, B(0.45, 0.6, 0.45), M.dark, -10.6, 1.3, -0.8);
  add(scene, C(0.04, 0.04, 0.02, 12), std('#ff5a4f', { emissive: '#ff5a4f' }), -10.37, 1.45, -0.8);
  for (const z of [0.3, 0.6, 0.9]) add(scene, C(0.06, 0.05, 0.12, 12), M.white, -10.5, 1.06, z);

  // Lounge
  add(scene, B(1, 0.45, 2.6), M.sofa, -9.9, 0.225, 4.9);
  add(scene, B(0.3, 0.55, 2.6), M.sofa, -10.35, 0.7, 4.9);
  for (const z of [4.3, 5.5]) add(scene, B(0.2, 0.35, 0.5), M.cushion, -10.1, 0.62, z);
  add(scene, C(0.4, 0.4, 0.05, 24), M.wood, -8.6, 0.45, 4.9);
  add(scene, C(0.05, 0.05, 0.45, 8), M.metal, -8.6, 0.22, 4.9);
  obstacles.push({ minX: -11, maxX: -9.4, minZ: 3.6, maxZ: 6.2 }, { x: -8.6, z: 4.9, r: 0.42 });

  // Bookshelf
  add(scene, B(2.4, 2.2, 0.5), M.woodDark, -8.6, 1.1, -6.75);
  obstacles.push({ minX: -9.8, maxX: -7.4, minZ: -7, maxZ: -6.5 });
  const bookColors = ['#7c5cff', '#2f80ed', '#e0457b', '#12a37f', '#ef8a3c', '#f2c46d'];
  for (const y of [0.45, 1.15, 1.85]) {
    let bx = -9.65;
    while (bx < -7.7) {
      const w = 0.1 + Math.random() * 0.1;
      const h = 0.4 + Math.random() * 0.15;
      add(scene, B(w, h, 0.3), std(bookColors[Math.floor(Math.random() * bookColors.length)]), bx + w / 2, y + h / 2 - 0.2, -6.6);
      bx += w + 0.02;
    }
  }

  for (const [x, z, s] of [[3.6, -6.4, 1.1], [10.3, -6.3, 1.2], [10.3, 6.2, 1], [-10.3, 6.4, 0.9], [10.3, -3, 0.8]]) {
    plant(scene, x, z, s);
    obstacles.push({ x, z, r: 0.32 * s });
  }

  const coffee = [-1.2, -0.4, 0.4, 1.2].map((z, k) => ({
    id: `coffee${k}`, kind: 'coffee',
    spot: v(-9.75, z),
    approach: [v(-8.6, z * 0.6), v(-9.75, z)],
    face: -Math.PI / 2,
  }));

  return {
    desks,
    locs: {
      desks: desks.map((d) => d.seat),
      visits: desks.map((d) => d.visit),
      coffee,
      meeting: meetingSeats(),
    },
    whiteboard: { ctx: canvas.getContext('2d'), texture },
    obstacles,
    bounds: { minX: -10.7, maxX: 10.7, minZ: -6.7, maxZ: 6.7 },
  };
}
