import * as THREE from 'three';
import { buildCharacter } from './character.js';

const HAIR = ['#f59ac0', '#a58be8', '#8fdcc0', '#f7b267', '#fff1a8', '#c8e3ff', '#46527f', '#34313f'];
const OUTFIT = ['#ff6fa8', '#7c5cff', '#2f80ed', '#12a37f', '#ef8a3c', '#e84855'];
const ACCESSORIES = [
  ['none', 'None'],
  ['ribbon', 'Ribbon'],
  ['catEars', 'Cat ears'],
  ['glasses', 'Glasses'],
  ['headphones', 'Headphones'],
  ['ahoge', 'Ahoge'],
  ['twintails', 'Twin-tails'],
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Character creator dialog with a spinning live preview.
 * Calls onJoin({ name, look, color }) when the visitor confirms.
 */
export function createJoinDialog(onJoin) {
  const dialog = document.getElementById('join-dialog');
  const form = document.getElementById('join-form');
  const nameInput = document.getElementById('join-name');
  const canvas = document.getElementById('join-preview');
  const options = document.getElementById('join-options');

  const choice = { hair: HAIR[0], outfit: OUTFIT[0], accessory: 'ribbon' };
  const rows = [];

  function row(label, key, values, render) {
    const wrap = document.createElement('div');
    wrap.className = 'join-row';
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = label;
    const list = document.createElement('div');
    list.className = 'chips';
    for (const value of values) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.value = value;
      render(b, value);
      b.addEventListener('click', () => {
        choice[key] = value;
        refresh();
      });
      list.append(b);
    }
    wrap.append(l, list);
    options.append(wrap);
    rows.push({ key, list });
  }

  const swatch = (b, c) => {
    b.className = 'swatch';
    b.style.background = c;
    b.setAttribute('aria-label', c);
  };
  row('Hair', 'hair', HAIR, swatch);
  row('Outfit', 'outfit', OUTFIT, swatch);
  const labels = Object.fromEntries(ACCESSORIES);
  row('Accessory', 'accessory', ACCESSORIES.map(([id]) => id), (b, id) => {
    b.className = 'chip-btn';
    b.textContent = labels[id];
  });

  document.getElementById('join-random').addEventListener('click', () => {
    Object.assign(choice, { hair: pick(HAIR), outfit: pick(OUTFIT), accessory: pick(ACCESSORIES)[0] });
    refresh();
  });

  const look = () => ({
    hair: choice.hair,
    eyes: choice.outfit,
    accessory: choice.accessory,
    trim: choice.outfit === '#ff6fa8' ? '#ffd84d' : '#ff6fa8',
  });

  function refresh() {
    for (const { key, list } of rows) {
      for (const b of list.children) b.classList.toggle('active', b.dataset.value === choice[key]);
    }
    rebuild();
  }

  // Live preview
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(220, 260, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#cbb89d', 1.6));
  const sun = new THREE.DirectionalLight('#fff1dc', 2);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 220 / 260, 0.1, 20);
  camera.position.set(0, 1.25, 4.4);
  camera.lookAt(0, 0.95, 0);

  let model = null;
  function rebuild() {
    if (model) {
      scene.remove(model);
      model.traverse((o) => o.geometry?.dispose());
    }
    model = new THREE.Group();
    buildCharacter(model, { color: choice.outfit, look: look() });
    scene.add(model);
  }
  refresh();

  let open = false;
  function loop(t) {
    if (!open) return;
    model.rotation.y = Math.sin(t / 1400) * 0.7;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function close() {
    open = false;
    dialog.close();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim() || 'Guest';
    close();
    onJoin({ name, look: look(), color: choice.outfit });
  });
  document.getElementById('join-cancel').addEventListener('click', close);
  dialog.addEventListener('close', () => (open = false));

  return {
    show() {
      dialog.showModal();
      nameInput.focus();
      open = true;
      requestAnimationFrame(loop);
    },
  };
}
