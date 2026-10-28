import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ROLES } from './data.js';
import { buildCharacter } from './character.js';

const WALK_SPEED = 2.6;

function angleLerp(a, b, t) {
  const TAU = Math.PI * 2;
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * t;
}

// Route out of one location's approach path, then in along the next one's.
function pathBetween(from, to) {
  if (from === to) return [];
  const back = from ? from.approach.slice(0, -1).reverse() : [];
  return [...back, ...to.approach];
}

/**
 * A robot agent driven by a queue of actions:
 *   walk  { to: location }
 *   say   { text, dur, kind }
 *   wait  { dur, until? }
 *   work  { tick(dt) -> done }
 *   until { cond() -> done }
 *   do    { fn() }
 * Any action can carry `status` (shown in the UI) and `interruptible` (a standup may cancel it).
 */
export class Agent {
  constructor(def, scene) {
    Object.assign(this, def);
    this.color = def.color ?? ROLES[def.role].color;
    this.queue = [];
    this.current = null;
    this.loc = null;
    this.status = 'Idle';
    this.walking = false;
    this.working = false;
    this.bubbleTimer = 0;
    this.yaw = 0;
    this.targetYaw = 0;
    this.phase = Math.random() * 10;

    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);

    const roleColor = new THREE.Color(this.color);
    Object.assign(this, buildCharacter(this.body, { color: this.color, look: def.look }));
    this.blinkIn = 1 + Math.random() * 3;
    this.happyTimer = 0;

    // Invisible, generous hit target for clicking
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.7, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.85;
    hit.userData.agent = this;
    this.group.add(hit);
    this.hitMesh = hit;

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.56, 40),
      new THREE.MeshBasicMaterial({ color: roleColor, transparent: true, opacity: 0.9 })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.ring.visible = false;
    this.group.add(this.ring);

    // Floating name tag + speech bubble
    this.labelEl = document.createElement('div');
    this.labelEl.className = 'agent-label';
    this.labelEl.dataset.agent = this.id;
    this.bubbleEl = document.createElement('div');
    this.bubbleEl.className = 'bubble';
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.style.setProperty('--c', this.color);
    tag.textContent = this.name;
    this.labelEl.append(this.bubbleEl, tag);
    const label = new CSS2DObject(this.labelEl);
    label.position.set(0, this.labelY, 0);
    label.center.set(0.5, 1);
    this.group.add(label);

    scene.add(this.group);
  }

  place(loc) {
    this.loc = loc;
    this.group.position.copy(loc.spot);
    this.yaw = this.targetYaw = loc.face;
  }

  say(text, dur = 2.5, kind = 'speech') {
    this.bubbleEl.textContent = text;
    this.bubbleEl.className = `bubble show ${kind}`;
    this.bubbleTimer = dur;
    this.talking = kind === 'speech';
    if (this.talking && /[!🎉🚀👍✨]/u.test(text)) this.happyTimer = Math.min(dur, 1.6);
  }

  // Little floating symbol (♪ ❤ ✨ 💦) that drifts up beside the name tag.
  emote(symbol) {
    const el = document.createElement('span');
    el.className = 'emote';
    el.textContent = symbol;
    this.labelEl.append(el);
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => el.remove(), 2000);
  }

  setSelected(on) {
    this.ring.visible = on;
    this.labelEl.classList.toggle('selected', on);
  }

  enqueue(...actions) {
    this.queue.push(...actions);
  }

  isIdle() {
    return !this.current && this.queue.length === 0;
  }

  interrupt() {
    this.current = null;
    this.queue.length = 0;
    this.working = false;
  }

  update(dt, t) {
    if (!this.current && this.queue.length) this.begin(this.queue.shift());
    if (this.current) this.step(dt);

    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) this.bubbleEl.classList.remove('show');
    }
    this.animate(dt, t);
  }

  begin(a) {
    this.current = a;
    a.elapsed = 0;
    if (a.status) this.status = a.status;
    if (a.type === 'walk') {
      a.path = pathBetween(this.loc, a.to);
      a.i = 0;
      this.loc = null;
      this.walking = true;
    } else if (a.type === 'say') {
      this.say(a.text, a.dur, a.kind);
    } else if (a.type === 'work') {
      this.working = true;
    }
    a.onStart?.(this);
    if (a.type === 'do') {
      a.fn(this);
      this.end();
    }
  }

  step(dt) {
    const a = this.current;
    a.elapsed += dt;
    switch (a.type) {
      case 'walk': {
        const pos = this.group.position;
        let remaining = WALK_SPEED * dt;
        while (remaining > 0 && a.i < a.path.length) {
          const target = a.path[a.i];
          const dx = target.x - pos.x;
          const dz = target.z - pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist <= remaining) {
            pos.x = target.x;
            pos.z = target.z;
            remaining -= dist;
            a.i++;
          } else {
            pos.x += (dx / dist) * remaining;
            pos.z += (dz / dist) * remaining;
            this.targetYaw = Math.atan2(dx, dz);
            remaining = 0;
          }
        }
        if (a.i >= a.path.length) {
          this.loc = a.to;
          this.targetYaw = a.to.face;
          this.walking = false;
          this.end();
        }
        break;
      }
      case 'say':
      case 'wait':
        if (a.elapsed >= a.dur || a.until?.()) this.end();
        break;
      case 'work':
        if (a.tick(dt)) this.end();
        break;
      case 'until':
        if (a.cond()) this.end();
        break;
    }
  }

  end() {
    if (this.current?.type === 'work') this.working = false;
    this.current = null;
  }

  animate(dt, t) {
    this.yaw = angleLerp(this.yaw, this.targetYaw, Math.min(1, dt * 10));
    this.group.rotation.y = this.yaw;

    // Bouncy hop with a little squash and side-to-side waddle when walking
    const hop = this.walking ? Math.abs(Math.sin(t * 10)) : 0;
    const breathe = Math.sin(t * 2.4 + this.phase) * 0.015;
    this.body.position.y = hop * 0.1;
    this.body.scale.set(1 - hop * 0.03 + breathe, 1 + hop * 0.04 - breathe, 1);
    this.body.rotation.z = this.walking ? Math.sin(t * 10) * 0.08 : 0;

    const [left, right] = this.hands;
    if (this.working) {
      left.position.set(-0.14, 0.52 + Math.sin(t * 18) * 0.03, 0.2);
      right.position.set(0.14, 0.52 + Math.cos(t * 18) * 0.03, 0.2);
    } else if (this.walking) {
      left.position.set(-0.23, 0.45, Math.sin(t * 10) * 0.1);
      right.position.set(0.23, 0.45, -Math.sin(t * 10) * 0.1);
    } else {
      left.position.set(-0.23, 0.45, 0.05);
      right.position.set(0.23, 0.45, 0.05);
    }

    // Head: nod while typing, curious tilt while idle
    this.head.rotation.x = this.working ? 0.18 + Math.sin(t * 6) * 0.04 : 0;
    this.head.rotation.z = this.working || this.walking ? 0 : Math.sin(t * 0.9 + this.phase) * 0.1;

    // Blink every few seconds
    this.blinkIn -= dt;
    if (this.blinkIn < -0.12) this.blinkIn = 2 + Math.random() * 3;
    const eyeY = this.blinkIn < 0 ? 0.12 : 1;
    for (const eye of this.eyes) eye.scale.y = eyeY;

    // "^ ^" eyes when happy
    this.happyTimer -= dt;
    const happy = this.happyTimer > 0;
    this.eyes.forEach((eye, i) => {
      eye.visible = !happy;
      this.happyEyes[i].visible = happy;
    });

    // Hair locks and tails swing with movement
    const swing = this.walking ? Math.sin(t * 10) * 0.18 : Math.sin(t * 1.6 + this.phase) * 0.05;
    for (const part of this.sway) {
      part.rotation.x = part.userData.base.x + swing * 0.6;
      part.rotation.z = part.userData.base.z + swing * 0.5;
    }

    // Flap the mouth while a speech bubble is up
    const talking = this.talking && this.bubbleTimer > 0 && Math.sin(t * 16) > 0;
    this.mouthOpen.visible = talking;
    this.smile.visible = !talking;
  }
}
