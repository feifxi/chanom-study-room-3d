import {
  STAGES, STAGE, TASK_POOL, REPLIES, BUG_LINES, BUG_REPLIES,
  IDLE_THOUGHTS, COFFEE_LINES, FREE_LINES, pick, rand,
} from './data.js';

const STANDUP_EVERY = 200; // sim seconds
const WORKDAY_MINUTES = 8 * 60;

export class Sim {
  constructor(agents, office) {
    this.agents = agents;
    this.office = office;
    this.locs = office.locs;
    this.tasks = [];
    this.nextId = 1;
    this.time = 0;
    this.meeting = null;
    this.nextStandup = 45;
    this.nextSpawn = 25;
    this.poolIndex = 0;
    this.shipped = 0;
    this.dirty = true;
    this.listeners = [];

    agents.forEach((a) => a.place(this.locs.desks[a.deskIndex]));
  }

  // ---------- public API ----------

  onLog(fn) {
    this.listeners.push(fn);
  }

  seed(count = 4) {
    for (let i = 0; i < count; i++) this.spawnFromPool();
  }

  addRequest(title) {
    this.addTask(title, true);
    this.log(`You added “${title}” to the backlog`);
    this.agent('pm')?.say(`New request: “${title}”. Rex, can you dig in?`, 3);
  }

  callStandup() {
    if (this.meeting) return;
    this.meeting = { phase: 'gathering', arrived: new Set() };
    this.nextStandup = this.time + STANDUP_EVERY;
    this.agent('pm')?.say('Standup time! Everyone to the table.', 2.5);
    this.log('Standup called');
  }

  clock() {
    const mins = Math.floor(this.time);
    const day = Math.floor(mins / WORKDAY_MINUTES) + 1;
    const m = (mins % WORKDAY_MINUTES) + 9 * 60;
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return `Day ${day} · ${hh}:${mm}`;
  }

  update(dt) {
    if (dt <= 0) return;
    this.time += dt;

    if (this.time >= this.nextSpawn) {
      this.nextSpawn = this.time + rand(22, 34);
      const waiting = this.tasks.filter((t) => t.stage === 'research' && !t.assignee).length;
      if (waiting < 2) this.spawnFromPool();
    }
    if (!this.meeting && this.time >= this.nextStandup) this.callStandup();
    this.updateMeeting(dt);

    for (const a of this.agents) {
      if (this.meeting?.phase === 'gathering' && a.current?.interruptible) a.interrupt();
      if (a.isIdle()) this.think(a);
      a.update(dt, this.time);
      this.office.desks[a.deskIndex].setScreen(a.working ? a.color : null, this.time);
    }
  }

  // ---------- tasks ----------

  log(text, agent) {
    const entry = { time: this.clock(), text, color: agent?.color };
    this.listeners.forEach((fn) => fn(entry));
  }

  agent(role) {
    return this.agents.find((a) => a.role === role);
  }

  addTask(title, ui) {
    const task = {
      id: this.nextId++, title, ui,
      stage: 'research', assignee: null, progress: 0,
      duration: rand(...STAGE.research.dur),
      inTransit: false, started: false, builtBy: null, bugs: 0,
    };
    this.tasks.push(task);
    this.dirty = true;
    return task;
  }

  spawnFromPool() {
    const n = this.poolIndex++;
    const p = TASK_POOL[n % TASK_POOL.length];
    const round = Math.floor(n / TASK_POOL.length);
    const title = round ? `${p.title} v${round + 1}` : p.title;
    this.addTask(title, p.ui);
    this.log(`New request: “${title}”`);
  }

  nextStageId(task) {
    let i = STAGES.findIndex((s) => s.id === task.stage) + 1;
    if (STAGES[i]?.id === 'design' && !task.ui) i++;
    return STAGES[i]?.id ?? 'done';
  }

  moveTask(task, stageId, assignee) {
    task.stage = stageId;
    task.progress = 0;
    task.started = false;
    task.inTransit = false;
    task.handoffTo = null;
    task.assignee = assignee;
    const [lo, hi] = STAGE[stageId].dur;
    task.duration = rand(lo, hi) * (stageId === 'build' && task.bugs ? 0.5 : 1);
    this.dirty = true;
  }

  finishedTaskOf(agent) {
    return this.tasks.find((t) => t.assignee === agent && t.progress >= 1 && !t.inTransit);
  }

  // Own work first, then the queued task furthest along the pipeline. An idle agent
  // also takes over work handed to a teammate who is still busy with something else.
  nextTaskFor(agent) {
    const own = this.tasks
      .filter((t) => t.assignee === agent && t.progress < 1 && !t.inTransit)
      .sort((a, b) => b.progress - a.progress)[0];
    if (own) return own;
    const claimable = (t) =>
      !t.assignee || (t.assignee !== agent && !t.started && t.assignee.working && t.assignee.current?.task !== t);
    const open = this.tasks.filter(
      (t) => !t.inTransit && t.stage !== 'done' && STAGE[t.stage].role === agent.role && claimable(t)
    );
    const order = (t) => STAGES.findIndex((s) => s.id === t.stage);
    open.sort((a, b) => order(b) - order(a) || a.id - b.id);
    return open[0];
  }

  hasWork(agent) {
    return this.meeting?.phase === 'gathering' || !!this.finishedTaskOf(agent) || !!this.nextTaskFor(agent);
  }

  pickRecipient(role) {
    const load = (a) =>
      this.tasks.filter((t) => (t.assignee === a || t.handoffTo === a) && t.stage !== 'done').length +
      (a.working ? 0.5 : 0);
    const candidates = this.agents.filter((a) => a.role === role);
    candidates.sort((a, b) => load(a) - load(b) || Math.random() - 0.5);
    return candidates[0];
  }

  // ---------- agent brains ----------

  think(agent) {
    if (this.meeting?.phase === 'gathering') {
      if (!this.meeting.arrived.has(agent.id)) this.goToMeeting(agent);
      return;
    }
    const finished = this.finishedTaskOf(agent);
    if (finished) return this.handoff(agent, finished);
    const task = this.nextTaskFor(agent);
    if (task) return this.startWork(agent, task);
    this.idle(agent);
  }

  startWork(agent, task) {
    if (task.assignee && task.assignee !== agent) {
      this.log(`${agent.name} took “${task.title}” off ${task.assignee.name}’s plate`, agent);
    }
    task.assignee = agent;
    this.dirty = true;
    const desk = this.locs.desks[agent.deskIndex];
    const stage = STAGE[task.stage];
    if (agent.loc !== desk) agent.enqueue({ type: 'walk', to: desk, status: 'Heading back to desk' });

    let thoughtIn = rand(1, 2);
    agent.enqueue({
      type: 'work',
      task,
      interruptible: true,
      status: `${stage.verb} “${task.title}”`,
      onStart: () => {
        if (!task.started) {
          task.started = true;
          this.log(`${agent.name} started ${stage.label.toLowerCase()} on “${task.title}”`, agent);
        }
      },
      tick: (dt) => {
        task.progress = Math.min(1, task.progress + dt / task.duration);
        thoughtIn -= dt;
        if (thoughtIn <= 0) {
          thoughtIn = rand(3.5, 5.5);
          agent.say(pick(stage.thoughts), 2.6, 'thought');
          if (Math.random() < 0.25) agent.emote('♪');
        }
        return task.progress >= 1;
      },
    });
  }

  handoff(agent, task) {
    const title = task.title;

    if (task.stage === 'ship') {
      task.stage = 'done';
      task.assignee = null;
      this.shipped++;
      this.dirty = true;
      this.log(`🚀 Shipped “${title}”`, agent);
      agent.enqueue({ type: 'say', text: `Shipped “${title}”! 🚀`, dur: 2.5, status: 'Celebrating a launch' });
      agent.emote('✨');
      const fan = pick(this.agents.filter((a) => a !== agent && !a.walking));
      fan?.say('🎉 Nice one!', 2);
      fan?.emote('❤');
      return;
    }

    if (task.stage === 'build') task.builtBy = agent;

    let next = this.nextStageId(task);
    let recipient;
    let line = STAGE[task.stage].doneLine(title);
    let replies = REPLIES;
    let isBug = false;

    if (task.stage === 'test' && Math.random() < (task.bugs === 0 ? 0.35 : 0.12)) {
      isBug = true;
      task.bugs++;
      next = 'build';
      recipient = task.builtBy;
      line = pick(BUG_LINES)(title);
      replies = BUG_REPLIES;
    }
    recipient ??= this.pickRecipient(STAGE[next].role);

    task.inTransit = true;
    task.handoffTo = recipient;
    task.assignee = null;
    this.dirty = true;

    const deliver = () => {
      const recipientHome = this.locs.desks[recipient.deskIndex];
      if (recipient.loc === recipientHome) {
        recipient.say(pick(replies), 1.8);
        recipient.emote(isBug ? '💦' : '♪');
      }
      else agent.say(`Leaving it on ${recipient.name}’s desk 📝`, 1.8);
      this.moveTask(task, next, recipient);
      if (isBug) this.log(`🐞 ${agent.name} found a bug in “${title}”, back to ${recipient.name}`, agent);
      else this.log(`${agent.name} handed “${title}” to ${recipient.name} for ${STAGE[next].label.toLowerCase()}`, agent);
    };

    if (recipient === agent) {
      deliver();
      return;
    }
    agent.enqueue(
      { type: 'walk', to: this.locs.visits[recipient.deskIndex], status: `Bringing “${title}” to ${recipient.name}` },
      { type: 'say', text: line, dur: 2.4 },
      { type: 'do', fn: deliver },
      { type: 'wait', dur: 1.4 }
    );
  }

  idle(agent) {
    const desk = this.locs.desks[agent.deskIndex];
    const until = () => this.hasWork(agent);

    if (agent.loc?.kind === 'coffee') {
      agent.enqueue({ type: 'walk', to: desk, status: 'Heading back to desk' });
      return;
    }

    const freeCoffee = this.locs.coffee.filter(
      (spot) => !this.agents.some((a) => a.loc === spot || a.current?.to === spot)
    );
    if (freeCoffee.length && Math.random() < 0.25) {
      const spot = pick(freeCoffee);
      agent.enqueue(
        { type: 'walk', to: spot, status: 'Grabbing a coffee' },
        { type: 'say', text: pick(COFFEE_LINES), dur: 2, interruptible: true, status: 'Coffee break', onStart: () => agent.emote('❤') },
        { type: 'wait', dur: rand(3, 6), until, interruptible: true }
      );
      return;
    }

    if (agent.loc !== desk) {
      agent.enqueue({ type: 'walk', to: desk, status: 'Heading back to desk' });
      return;
    }

    agent.enqueue({
      type: 'wait',
      dur: rand(2, 4),
      until,
      interruptible: true,
      status: 'Idle, waiting for work',
      onStart: () => Math.random() < 0.3 && agent.say(pick(IDLE_THOUGHTS), 2.2, 'thought'),
    });
  }

  // ---------- standups ----------

  goToMeeting(agent) {
    const seat = this.locs.meeting[this.agents.indexOf(agent)];
    agent.enqueue(
      { type: 'walk', to: seat, status: 'Heading to standup' },
      { type: 'do', fn: () => this.meeting?.arrived.add(agent.id) },
      { type: 'until', cond: () => !this.meeting, status: 'In standup' }
    );
  }

  statusLine(agent) {
    const mine = this.tasks.find((t) => t.assignee === agent && t.stage !== 'done');
    const queued = this.tasks.filter(
      (t) => !t.assignee && !t.inTransit && t.stage !== 'done' && STAGE[t.stage].role === agent.role
    ).length;
    if (mine) {
      const s = STAGE[mine.stage];
      let line = `${s.verb} “${mine.title}”, ${Math.round(mine.progress * 100)}% done.`;
      if (queued) line += ` ${queued} more queued.`;
      return line;
    }
    if (queued) return `${queued} in my queue, starting next.`;
    return pick(FREE_LINES);
  }

  updateMeeting(dt) {
    const m = this.meeting;
    if (!m) return;

    if (m.phase === 'gathering' && m.arrived.size === this.agents.length) {
      const pm = this.agent('pm');
      m.phase = 'talking';
      m.timer = 0.6;
      m.script = [
        { agent: pm, text: () => 'Morning team! Quick round, everyone.' },
        ...this.agents.map((a) => ({ agent: a, text: () => this.statusLine(a) })),
        { agent: pm, text: () => `${this.shipped} shipped so far. Back to it!` },
      ];
      this.log('Standup started');
    }

    if (m.phase === 'talking') {
      m.timer -= dt;
      if (m.timer > 0) return;
      const line = m.script.shift();
      if (!line) {
        this.meeting = null;
        this.log('Standup wrapped up');
        return;
      }
      line.agent.say(line.text(), 3);
      line.agent.status = 'Speaking at standup';
      m.timer = 3.2;
    }
  }
}
