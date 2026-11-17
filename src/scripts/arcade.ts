type Packet = { x: number; y: number; v: number; good: boolean; r: number };

type ArcadeEls = {
  dialog: HTMLDialogElement;
  canvas: HTMLCanvasElement;
  scoreEl: HTMLElement;
  hiEl: HTMLElement | null;
  pauseBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
  ctx: CanvasRenderingContext2D;
};

const HI_KEY = 'debugsito-arcade-hi';

let wired = false;
let raf = 0;
let running = false;
let paused = false;
let score = 0;
let hiScore = 0;
let lives = 5;
let combo = 0;
let paddle = { x: 180, w: 116, h: 12 };
let packets: Packet[] = [];
let spawn = 0;
let lastTs = 0;
const keys = { left: false, right: false };
const hitPad = 14;

function loadHi() {
  try {
    hiScore = Math.max(0, Number(localStorage.getItem(HI_KEY) || 0) || 0);
  } catch {
    hiScore = 0;
  }
}

function saveHi() {
  if (score <= hiScore) return;
  hiScore = score;
  try {
    localStorage.setItem(HI_KEY, String(hiScore));
  } catch {
    /* ignore */
  }
}

function syncScoreUi(els: ArcadeEls) {
  els.scoreEl.textContent = `score ${score}`;
  if (els.hiEl) els.hiEl.textContent = `hi ${hiScore}`;
}

function query(): ArcadeEls | null {
  const dialog = document.getElementById('arcade') as HTMLDialogElement | null;
  const canvas = document.getElementById('arcade-canvas') as HTMLCanvasElement | null;
  const scoreEl = document.querySelector<HTMLElement>('[data-arcade-score]');
  const hiEl = document.querySelector<HTMLElement>('[data-arcade-hi]');
  const pauseBtn = document.querySelector<HTMLButtonElement>('[data-arcade-pause]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-arcade-close]');
  const ctx = canvas?.getContext('2d') ?? null;
  if (!dialog || !canvas || !scoreEl || !pauseBtn || !closeBtn || !ctx) return null;
  return { dialog, canvas, scoreEl, hiEl, pauseBtn, closeBtn, ctx };
}

function padY(canvas: HTMLCanvasElement) {
  return canvas.height - 26;
}

function reset(els: ArcadeEls) {
  score = 0;
  lives = 5;
  combo = 0;
  packets = [];
  spawn = 0;
  paddle.w = Math.min(116, Math.floor(els.canvas.width * 0.28));
  paddle.x = els.canvas.width / 2 - paddle.w / 2;
  loadHi();
  syncScoreUi(els);
}

function paintBg(els: ArcadeEls) {
  const { ctx, canvas } = els;
  ctx.fillStyle = '#0d1218';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1e3a44';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  for (let y = 20; y < canvas.height; y += 20) {
    ctx.fillStyle = 'rgba(78,207,227,0.05)';
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

function draw(els: ArcadeEls) {
  const { ctx, canvas } = els;
  paintBg(els);
  ctx.fillStyle = 'rgba(78,207,227,0.25)';
  ctx.fillRect(paddle.x - 2, padY(canvas) - 2, paddle.w + 4, paddle.h + 4);
  ctx.fillStyle = '#4ecfe3';
  ctx.fillRect(paddle.x, padY(canvas), paddle.w, paddle.h);
  for (const p of packets) {
    ctx.beginPath();
    ctx.fillStyle = p.good ? '#3dba8a' : '#e07070';
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#9aa0a8';
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillText(`vidas ${lives}`, 12, 18);
  ctx.fillText(`hi ${hiScore}`, canvas.width - 64, 18);
  if (combo > 1) ctx.fillText(`combo x${combo}`, 100, 18);
  if (paused) {
    ctx.fillStyle = 'rgba(13,18,24,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#eceae4';
    const msg =
      lives <= 0
        ? score >= hiScore && score > 0
          ? `game over · hi ${hiScore}`
          : 'game over · reiniciar'
        : 'pausado';
    ctx.fillText(msg, canvas.width / 2 - 70, canvas.height / 2);
  }
}

function spawnInterval() {
  return Math.max(720, 1350 - score * 18);
}

function step(ts: number) {
  const els = query();
  if (!els || !running) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dt = lastTs ? Math.min(32, ts - lastTs) / 16.67 : 1;
  lastTs = ts;
  const { canvas } = els;

  if (!paused && !reduce) {
    const speed = 7.2 * dt;
    if (keys.left) paddle.x = Math.max(8, paddle.x - speed);
    if (keys.right) paddle.x = Math.min(canvas.width - paddle.w - 8, paddle.x + speed);

    if (ts - spawn > spawnInterval()) {
      spawn = ts;
      const goodChance = Math.max(0.62, 0.82 - score * 0.004);
      packets.push({
        x: 28 + Math.random() * (canvas.width - 56),
        y: -12,
        v: 1.05 + Math.random() * 1.15 + Math.min(score / 55, 1.4),
        good: Math.random() < goodChance,
        r: 7 + Math.random() * 2.5,
      });
    }

    const next: Packet[] = [];
    for (const p of packets) {
      p.y += p.v * dt;
      const hit =
        p.y + p.r >= padY(canvas) - 2 &&
        p.y - p.r <= padY(canvas) + paddle.h + 6 &&
        p.x >= paddle.x - hitPad &&
        p.x <= paddle.x + paddle.w + hitPad;

      if (hit) {
        if (p.good) {
          combo += 1;
          score += combo > 2 ? 2 : 1;
          saveHi();
          syncScoreUi(els);
        } else {
          combo = 0;
          lives -= 1;
        }
        continue;
      }
      if (p.y - p.r > canvas.height) {
        if (p.good) {
          combo = 0;
          if (score >= 3) lives -= 1;
        }
        continue;
      }
      next.push(p);
    }
    packets = next;
    if (lives <= 0) {
      paused = true;
      saveHi();
      syncScoreUi(els);
      els.pauseBtn.textContent = 'reiniciar';
      els.pauseBtn.setAttribute('aria-pressed', 'true');
    }
  } else if (!paused && reduce && packets.length === 0) {
    packets = [
      { x: 120, y: 80, v: 0, good: true, r: 8 },
      { x: 280, y: 140, v: 0, good: false, r: 8 },
    ];
  }

  draw(els);
  raf = requestAnimationFrame(step);
}

function movePaddleToClientX(canvas: HTMLCanvasElement, clientX: number) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0) return;
  const scale = canvas.width / rect.width;
  const x = (clientX - rect.left) * scale - paddle.w / 2;
  paddle.x = Math.max(8, Math.min(canvas.width - paddle.w - 8, x));
}

function togglePause() {
  const els = query();
  if (!els) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (lives <= 0) {
    reset(els);
    paused = false;
    els.pauseBtn.textContent = 'pausar';
    els.pauseBtn.setAttribute('aria-pressed', 'false');
    return;
  }
  if (reduce) return;
  paused = !paused;
  els.pauseBtn.textContent = paused ? 'reanudar' : 'pausar';
  els.pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
}

export function openArcade() {
  const els = query();
  if (!els) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  reset(els);
  paused = reduce;
  lastTs = 0;
  els.pauseBtn.textContent = paused ? (reduce ? 'modo estático' : 'reanudar') : 'pausar';
  els.pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');

  try {
    if (!els.dialog.open) els.dialog.showModal();
  } catch {
    els.dialog.setAttribute('open', '');
    els.dialog.classList.add('is-fallback-open');
  }

  running = true;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(step);
}

export function closeArcade() {
  const els = query();
  running = false;
  cancelAnimationFrame(raf);
  keys.left = keys.right = false;
  if (!els) return;
  try {
    if (els.dialog.open) els.dialog.close();
  } catch {
    /* ignore */
  }
  els.dialog.removeAttribute('open');
  els.dialog.classList.remove('is-fallback-open');
}

export function bootArcade() {
  const els = query();
  if (!els) return;

  els.pauseBtn.onclick = (e) => {
    e.preventDefault();
    togglePause();
  };
  els.closeBtn.onclick = (e) => {
    e.preventDefault();
    closeArcade();
  };
  els.dialog.addEventListener('close', () => {
    running = false;
    cancelAnimationFrame(raf);
  });

  els.canvas.onpointermove = (e) => {
    if (!running || paused) return;
    const live = query();
    if (!live) return;
    movePaddleToClientX(live.canvas, e.clientX);
  };
  els.canvas.onpointerdown = (e) => {
    if (!running) return;
    const live = query();
    if (!live) return;
    live.canvas.setPointerCapture(e.pointerId);
    movePaddleToClientX(live.canvas, e.clientX);
  };

  if (wired) return;
  wired = true;

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest('[data-arcade-open]')) return;
      e.preventDefault();
      e.stopPropagation();
      openArcade();
    },
    true,
  );

  document.addEventListener('debugsito:arcade-open', () => openArcade());

  window.addEventListener('keydown', (e) => {
    const elsNow = query();
    if (!running || !elsNow?.dialog.open) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePause();
    }
    if (e.key === 'Escape') closeArcade();
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });
}
