import { ROLES, STAGES } from './data.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const COLUMNS = [...STAGES.map((s) => ({ id: s.id, label: s.label, color: ROLES[s.role].color })), { id: 'done', label: 'Done', color: '#8a93a6' }];

function columnTasks(tasks, id) {
  const items = tasks.filter((t) => t.stage === id);
  return id === 'done' ? items.slice(-4).reverse() : items;
}

export function createUI({ agents, sim, onSelect, onSpeed }) {
  const $ = (id) => document.getElementById(id);
  let selected = null;
  let boardSig = '';

  // Team roster
  const cards = new Map();
  for (const a of agents) {
    const el = document.createElement('button');
    el.className = 'member';
    el.style.setProperty('--c', a.color);
    el.style.setProperty('--hair', a.look.hair);
    el.innerHTML = `
      <span class="avatar"></span>
      <span class="who"><b>${a.name}</b><small>${ROLES[a.role].label}</small></span>
      <span class="status"></span>
      <span class="bar"><i></i></span>`;
    el.addEventListener('click', () => onSelect(selected === a ? null : a));
    $('team').append(el);
    cards.set(a, { el, status: el.querySelector('.status'), bar: el.querySelector('.bar i') });
  }

  // Controls
  $('speed').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) onSpeed(Number(b.dataset.speed));
  });
  $('standup').addEventListener('click', () => sim.callStandup());
  $('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('task-input').value.trim();
    if (!title) return;
    sim.addRequest(title);
    $('task-input').value = '';
  });
  $('panel-toggle').addEventListener('click', () => document.body.classList.toggle('show-panel'));

  // Activity feed
  const feed = $('feed');
  sim.onLog((e) => {
    const li = document.createElement('li');
    li.style.setProperty('--c', e.color ?? '#b4bccb');
    li.innerHTML = `<time>${e.time.split('· ')[1]}</time><span>${esc(e.text)}</span>`;
    feed.prepend(li);
    while (feed.children.length > 80) feed.lastChild.remove();
  });

  function renderBoard() {
    const sig = sim.tasks.map((t) => `${t.id}${t.stage}${t.assignee?.id}${t.inTransit}${t.bugs}`).join('|');
    if (sig !== boardSig) {
      boardSig = sig;
      $('board').innerHTML = COLUMNS.map((col) => {
        const all = sim.tasks.filter((t) => t.stage === col.id);
        const cardsHtml = columnTasks(sim.tasks, col.id)
          .map((t) => {
            const who = t.assignee
              ? `<span class="chip" style="--c:${t.assignee.color}">${t.assignee.name}</span>`
              : `<span class="muted">${t.inTransit ? 'handing off…' : col.id === 'done' ? 'shipped' : 'queued'}</span>`;
            const bug = t.bugs ? `<span class="bug" title="Bugs found">🐞 ${t.bugs}</span>` : '';
            const prog = col.id === 'done' ? '' : `<span class="prog"><i data-id="${t.id}"></i></span>`;
            return `<div class="card${t.assignee ? ' active' : ''}"><p>${esc(t.title)}</p><div class="meta">${who}${bug}</div>${prog}</div>`;
          })
          .join('');
        return `<div class="col" style="--c:${col.color}"><h3><span class="pip"></span>${col.label}<em>${all.length}</em></h3><div class="cards">${cardsHtml}</div></div>`;
      }).join('');
    }
    for (const bar of $('board').querySelectorAll('.prog i')) {
      const t = sim.tasks.find((task) => task.id === Number(bar.dataset.id));
      if (t) bar.style.width = `${Math.round(t.progress * 100)}%`;
    }
  }

  return {
    update() {
      $('clock').textContent = sim.clock();
      $('shipped').textContent = sim.shipped;
      $('standup').disabled = !!sim.meeting;
      for (const [a, c] of cards) {
        c.status.textContent = a.status;
        const task = a.current?.type === 'work' ? a.current.task : null;
        c.bar.style.width = task ? `${Math.round(task.progress * 100)}%` : '0%';
        c.el.classList.toggle('busy', !!task);
      }
      renderBoard();
    },
    setSpeed(speed) {
      for (const b of $('speed').querySelectorAll('button')) b.classList.toggle('active', Number(b.dataset.speed) === speed);
    },
    setSelected(agent) {
      selected = agent;
      for (const [a, c] of cards) c.el.classList.toggle('selected', a === agent);
    },
  };
}

// Sprint board drawn on the office whiteboard texture.
export function drawWhiteboard(ctx, tasks) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.fillStyle = '#fbfbf7';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#39405a';
  ctx.font = 'bold 28px "Marker Felt", "Comic Sans MS", sans-serif';
  ctx.fillText('SPRINT BOARD', 24, 42);

  const colW = (W - 32) / COLUMNS.length;
  COLUMNS.forEach((col, i) => {
    const x = 16 + i * colW;
    ctx.fillStyle = col.color;
    ctx.font = 'bold 20px "Marker Felt", "Comic Sans MS", sans-serif';
    ctx.fillText(col.label, x + 10, 84);
    if (i > 0) {
      ctx.strokeStyle = '#d5d8e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x, H - 16);
      ctx.stroke();
    }
    const items = columnTasks(tasks, col.id);
    items.slice(0, 6).forEach((t, k) => {
      const y = 100 + k * 46;
      ctx.fillStyle = col.color + '33';
      ctx.fillRect(x + 8, y, colW - 16, 38);
      ctx.fillStyle = col.color;
      ctx.fillRect(x + 8, y, 5, 38);
      ctx.fillStyle = '#2c3145';
      ctx.font = '15px "Marker Felt", "Comic Sans MS", sans-serif';
      const label = t.title.length > 14 ? `${t.title.slice(0, 13)}…` : t.title;
      ctx.fillText(label, x + 18, y + 24);
    });
  });
}
