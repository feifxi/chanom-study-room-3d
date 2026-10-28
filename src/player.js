import * as THREE from 'three';
import { Agent } from './agent.js';

const RADIUS = 0.3;
const WALK = 3;
const RUN = 5.2;
const UP = new THREE.Vector3(0, 1, 0);

const KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

/**
 * The visitor's own character. Reuses Agent for the model, name tag and speech
 * bubble, but is driven by keyboard / click-to-move instead of the simulation.
 */
export class Player {
  constructor(scene, office, { name, look, color }) {
    this.scene = scene;
    this.office = office;
    this.name = name;
    this.agent = new Agent({ id: 'player', name: `${name} (you)`, role: 'guest', deskIndex: -1, look, color }, scene);
    this.agent.labelEl.classList.add('is-player');
    this.agent.ring.visible = true;
    this.agent.group.position.set(-4.5, 0, 0);
    this.agent.yaw = this.agent.targetYaw = Math.PI / 4;

    this.keys = new Set();
    this.target = null;
    this.stuck = 0;
    this.fwd = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.move = new THREE.Vector3();
    this.turn = new THREE.Vector3();

    this.onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (KEYS[e.code] || e.key === 'Shift') {
        this.keys.add(e.code);
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onBlur = () => this.keys.clear();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  get position() {
    return this.agent.group.position;
  }

  walkTo(point) {
    this.target = new THREE.Vector3(point.x, 0, point.z);
    this.stuck = 0;
  }

  update(dt, t, camera, others) {
    const pos = this.position;
    let ix = 0;
    let iz = 0;
    for (const code of this.keys) {
      if (KEYS[code]) {
        ix += KEYS[code][0];
        iz += KEYS[code][1];
      }
    }

    this.move.set(0, 0, 0);
    if (ix || iz) {
      // Keys move relative to the camera, so "up" is always up the screen
      this.target = null;
      camera.getWorldDirection(this.fwd);
      this.fwd.y = 0;
      this.fwd.normalize();
      this.right.crossVectors(this.fwd, UP);
      this.move.addScaledVector(this.fwd, -iz).addScaledVector(this.right, ix);
    } else if (this.target) {
      this.move.subVectors(this.target, pos).setY(0);
      if (this.move.length() < 0.12) {
        this.target = null;
        this.move.set(0, 0, 0);
      }
    }

    const moving = this.move.lengthSq() > 0;
    if (moving) {
      this.move.normalize();
      const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? RUN : WALK;
      const before = pos.clone();
      const step = speed * dt;
      pos.addScaledVector(this.move, step);
      this.collide(others);

      // Blocked head-on? Try veering left/right so we slide around the obstacle.
      if (pos.distanceTo(before) < step * 0.5) {
        let best = pos.clone();
        let bestGain = -Infinity;
        for (const angle of [0.7, -0.7, 1.4, -1.4]) {
          pos.copy(before).addScaledVector(this.turn.copy(this.move).applyAxisAngle(UP, angle), step);
          this.collide(others);
          const gain = this.target ? before.distanceTo(this.target) - pos.distanceTo(this.target) : pos.distanceTo(before) * Math.cos(angle);
          if (gain > bestGain) {
            bestGain = gain;
            best = pos.clone();
          }
        }
        pos.copy(best);
      }
      this.agent.targetYaw = Math.atan2(this.move.x, this.move.z);

      // Give up on a click target if a wall or desk is in the way
      if (this.target) {
        this.stuck = pos.distanceTo(before) < speed * dt * 0.2 ? this.stuck + dt : 0;
        if (this.stuck > 0.4) this.target = null;
      }
    }
    this.agent.walking = moving;
    this.agent.update(dt, t);
  }

  collide(others) {
    const p = this.position;
    for (const o of this.office.obstacles) {
      if (o.r !== undefined) {
        pushOutOfCircle(p, o.x, o.z, o.r + RADIUS);
        continue;
      }
      const cx = THREE.MathUtils.clamp(p.x, o.minX, o.maxX);
      const cz = THREE.MathUtils.clamp(p.z, o.minZ, o.maxZ);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * RADIUS;
        p.z = cz + (dz / d) * RADIUS;
      } else {
        // Centre is inside the box: push out through the nearest side
        const exits = [
          [o.minX - RADIUS - p.x, 0], [o.maxX + RADIUS - p.x, 0],
          [0, o.minZ - RADIUS - p.z], [0, o.maxZ + RADIUS - p.z],
        ];
        exits.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
        p.x += exits[0][0];
        p.z += exits[0][1];
      }
    }
    for (const other of others) {
      const q = other.group.position;
      pushOutOfCircle(p, q.x, q.z, RADIUS * 2);
    }
    const b = this.office.bounds;
    p.x = THREE.MathUtils.clamp(p.x, b.minX, b.maxX);
    p.z = THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ);
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.scene.remove(this.agent.group);
    this.agent.labelEl.remove();
  }
}

function pushOutOfCircle(p, x, z, r) {
  const dx = p.x - x;
  const dz = p.z - z;
  const d = Math.hypot(dx, dz);
  if (d >= r) return;
  if (d < 1e-6) {
    p.x = x + r;
    return;
  }
  p.x = x + (dx / d) * r;
  p.z = z + (dz / d) * r;
}
