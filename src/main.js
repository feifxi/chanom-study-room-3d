import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import './style.css';
import { AGENTS } from './data.js';
import { buildOffice } from './office.js';
import { Agent } from './agent.js';
import { Sim } from './sim.js';
import { createUI, drawWhiteboard } from './ui.js';
import { Player } from './player.js';
import { createJoinDialog } from './join.js';
import { pick } from './data.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const labelRenderer = new CSS2DRenderer({ element: document.querySelector('#labels') });

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(1, 0.9, 1).normalize().multiplyScalar(50);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minZoom = 0.6;
controls.maxZoom = 3.5;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = 1.25;

const office = buildOffice(scene);
const agents = AGENTS.map((def) => new Agent(def, scene));
const sim = new Sim(agents, office);

let speed = 1;
let selected = null;

const ui = createUI({
  agents,
  sim,
  onSelect: select,
  onSpeed: setSpeed,
});
sim.seed();
setSpeed(1);

function select(agent) {
  selected?.setSelected(false);
  selected = agent;
  agent?.setSelected(true);
  ui.setSelected(agent);
}

function setSpeed(s) {
  speed = s;
  ui.setSpeed(s);
}

// ---------- joining as a guest ----------

let player = null;
const joinBtn = document.querySelector('#join');
const chatForm = document.querySelector('#chat');
const chatInput = document.querySelector('#chat-input');
const hint = document.querySelector('.hint');
const HINT_VIEW = hint.textContent;
const HINT_PLAY = 'WASD / arrows to walk · Shift to run · Click the floor to walk there · Enter to chat';

const joinDialog = createJoinDialog(({ name, look, color }) => {
  player = new Player(scene, office, { name, look, color });
  select(null);
  camera.zoom = Math.max(camera.zoom, 1.8);
  camera.updateProjectionMatrix();
  document.body.classList.add('joined');
  joinBtn.textContent = 'Leave';
  hint.textContent = HINT_PLAY;
  player.agent.say('Hello everyone! 👋', 2.5);
  sim.log(`${name} joined the office`, player.agent);
});

function leave() {
  sim.log(`${player.name} left the office`, player.agent);
  player.dispose();
  player = null;
  document.body.classList.remove('joined');
  joinBtn.textContent = 'Join';
  hint.textContent = HINT_VIEW;
}

joinBtn.addEventListener('click', () => (player ? leave() : joinDialog.show()));

function replyTo(text, agent) {
  const name = player.name;
  if (/\b(hi|hello|hey|yo|hiya|morning)\b/i.test(text)) return pick([`Hi ${name}! 👋`, `Hey ${name}! ♪`, 'Welcome to the office!']);
  if (/how are (you|u)|how's it going/i.test(text)) return pick(['Busy but happy!', 'Great! Shipping stuff ✨', 'Doing well, thanks!']);
  if (/doing|working|busy|up to/i.test(text)) return `${agent.status}, hehe!`;
  if (/\?\s*$/.test(text)) return pick(['Good question! Let me check…', 'Hmm, maybe ask Ada?', 'I think so!']);
  return pick(['Haha, totally!', 'Nice! ♪', 'Love that!', 'Hehe ✨', 'Good vibes!']);
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  chatInput.value = '';
  chatInput.blur();
  if (!text || !player) return;
  player.agent.say(text, 3.5);
  sim.log(`${player.name}: “${text}”`, player.agent);

  // Up to two agents within earshot reply
  const p = player.position;
  agents
    .map((a) => ({ a, d: a.group.position.distanceTo(p) }))
    .filter(({ d }) => d < 3.2)
    .sort((x, y) => x.d - y.d)
    .slice(0, 2)
    .forEach(({ a }, i) => {
      setTimeout(() => {
        if (!player) return;
        const reply = replyTo(text, a);
        a.say(reply, 3);
        a.emote(pick(['♪', '❤', '✨']));
        sim.log(`${a.name}: “${reply}”`, a);
      }, 900 + i * 1100);
    });
});

// Agents say hi when you walk up to them
const greetCooldown = new Map();
function greetNearby(now) {
  const p = player.position;
  for (const a of agents) {
    if ((greetCooldown.get(a) ?? 0) > now || a.bubbleTimer > 0) continue;
    if (a.group.position.distanceTo(p) > 1.6) continue;
    greetCooldown.set(a, now + 45);
    a.say(pick([`Hi ${player.name}! 👋`, `Oh, hi ${player.name}!`, `Hey ${player.name}! ♪`]), 2.2);
    a.emote('❤');
  }
}

// Frame the office inside the area not covered by the side panel and board.
function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);

  const wide = w > 820;
  const right = wide ? 356 : 0;
  const top = wide ? 84 : 72;
  const bottom = wide ? 222 : 0;
  const visW = w - right;
  const visH = h - top - bottom;

  const sx = w / 2 - visW / 2;
  const sy = h / 2 - (top + visH / 2);
  const fullW = w + 2 * Math.abs(sx);
  const fullH = h + 2 * Math.abs(sy);
  const ox = sx > 0 ? 2 * sx : 0;
  const oy = sy > 0 ? 2 * sy : 0;

  const unitsTall = Math.max(15, (26 * visH) / visW);
  const perPx = unitsTall / visH;
  camera.left = (-fullW * perPx) / 2;
  camera.right = (fullW * perPx) / 2;
  camera.top = (fullH * perPx) / 2;
  camera.bottom = (-fullH * perPx) / 2;
  camera.setViewOffset(fullW, fullH, ox, oy, w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', layout);
layout();

// Click an agent (in the scene or on its name tag) to follow it
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hitMeshes = agents.map((a) => a.hitMesh);
let down = null;
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const floorHit = new THREE.Vector3();
canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 5) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(hitMeshes, false)[0];
  const agent = hit?.object.userData.agent ?? null;
  select(agent);
  if (player) {
    // Walk to the clicked spot, or up to the clicked agent
    if (agent) {
      const to = agent.group.position.clone().sub(player.position).setY(0);
      const len = Math.max(0, to.length() - 0.9);
      player.walkTo(player.position.clone().add(to.setLength(len)));
    } else if (raycaster.ray.intersectPlane(floor, floorHit)) {
      player.walkTo(floorHit);
    }
  }
});
document.querySelector('#labels').addEventListener('click', (e) => {
  const id = e.target.closest('.agent-label')?.dataset.agent;
  const agent = agents.find((a) => a.id === id);
  if (agent) select(selected === agent ? null : agent);
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  if (e.key === 'Escape') select(null);
  if (e.key === 'Enter' && player) {
    e.preventDefault();
    chatInput.focus();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    setSpeed(speed === 0 ? 1 : 0);
  }
});

// Main loop
const timer = new THREE.Timer();
const follow = new THREE.Vector3();
let uiTimer = 0;

function frame() {
  timer.update();
  const realDt = Math.min(timer.getDelta(), 0.05);
  sim.update(realDt * speed);

  if (player) {
    player.update(realDt, timer.getElapsed(), camera, agents);
    greetNearby(timer.getElapsed());
  }

  const followed = player?.agent ?? selected;
  if (followed) {
    const p = followed.group.position;
    follow.set(p.x, 0, p.z).sub(controls.target).multiplyScalar(Math.min(1, realDt * 4));
    controls.target.add(follow);
    camera.position.add(follow);
  }
  controls.update();

  uiTimer -= realDt;
  if (uiTimer <= 0) {
    uiTimer = 0.2;
    ui.update();
    if (sim.dirty) {
      sim.dirty = false;
      drawWhiteboard(office.whiteboard.ctx, sim.tasks);
      office.whiteboard.texture.needsUpdate = true;
    }
  }

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
