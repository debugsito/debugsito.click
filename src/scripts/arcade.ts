type Packet = { x: number; y: number; v: number; good: boolean; r: number };

let booted = false;

export function bootArcade() {
  const dialog = document.getElementById('arcade') as HTMLDialogElement | null;
  const canvas = document.getElementById('arcade-canvas') as HTMLCanvasElement | null;
  const scoreEl = document.querySelector('[data-arcade-score]');
  const pauseBtn = document.querySelector('[data-arcade-pause]') as HTMLButtonElement | null;
  const closeBtn = document.querySelector('[data-arcade-close]') as HTMLButtonElement | null;
  if (!dialog || !canvas || !scoreEl || !pauseBtn || !closeBtn) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let running = false;
  let paused = false;
  let score = 0;
  let lives = 5;
  let combo = 0;
  let paddle = { x: canvas.width / 2 - 58, w: 116, h: 12 };
  let packets: Packet[] = [];
  let spawn = 0;
  let lastTs = 0;
  const keys = { left: false, right: false };
  const padY = () => canvas.height - 26;
  const hitPad = 14; // forgiving horizontal hitbox

  function paintBg() {
    ctx.fillStyle = '#0d1218';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a44';
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    for (let y = 20; y < canvas.height; y += 20) {
      ctx.fillStyle = 'rgba(78,207,227,0.05)';
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }

  function draw() {
    paintBg();
    ctx.fillStyle = '#4ecfe3';
    ctx.fillRect(paddle.x, padY(), paddle.w, paddle.h);
    ctx.fillStyle = 'rgba(78,207,227,0.25)';
    ctx.fillRect(paddle.x - 2, padY() - 2, paddle.w + 4, paddle.h + 4);
    for (const p of packets) {
      ctx.beginPath();
      ctx.fillStyle = p.good ? '#3dba8a' : '#e07070';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.good) {
        ctx.strokeStyle = 'rgba(61,186,138,0.45)';
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#9aa0a8';
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(`vidas ${lives}`, 12, 18);
    if (combo > 1) ctx.fillText(`combo x${combo}`, 100, 18);
    if (paused) {
      ctx.fillStyle = 'rgba(13,18,24,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#eceae4';
      ctx.fillText(
        lives <= 0 ? 'game over · reiniciar' : 'pausado',
        canvas.width / 2 - 70,
        canvas.height / 2,
      );
    }
  }

  function reset() {
    score = 0;
    lives = 5;
    combo = 0;
    packets = [];
    spawn = 0;
    paddle.x = canvas.width / 2 - paddle.w / 2;
    scoreEl.textContent = 'score 0';
  }

  function spawnInterval() {
    // starts chill (~1.35s), ramps gently
    return Math.max(720, 1350 - score * 18);
  }

  function step(ts: number) {
    if (!running) return;
    const dt = lastTs ? Math.min(32, ts - lastTs) / 16.67 : 1;
    lastTs = ts;

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
          p.y + p.r >= padY() - 2 &&
          p.y - p.r <= padY() + paddle.h + 6 &&
          p.x >= paddle.x - hitPad &&
          p.x <= paddle.x + paddle.w + hitPad;

        if (hit) {
          if (p.good) {
            combo += 1;
            score += combo > 2 ? 2 : 1;
            scoreEl.textContent = `score ${score}`;
          } else {
            combo = 0;
            lives -= 1;
          }
          continue;
        }
        if (p.y - p.r > canvas.height) {
          if (p.good) {
            combo = 0;
            // missed deploy: only lose a life every other miss after warm-up
            if (score >= 3) lives -= 1;
          }
          continue;
        }
        next.push(p);
      }
      packets = next;
      if (lives <= 0) {
        paused = true;
        pauseBtn.textContent = 'reiniciar';
        pauseBtn.setAttribute('aria-pressed', 'true');
      }
    } else if (!paused && reduce) {
      if (packets.length === 0) {
        packets = [
          { x: 120, y: 80, v: 0, good: true, r: 8 },
          { x: 280, y: 140, v: 0, good: false, r: 8 },
        ];
      }
    }
    draw();
    raf = requestAnimationFrame(step);
  }

  function open() {
    reset();
    paused = reduce;
    lastTs = 0;
    pauseBtn.textContent = paused ? (reduce ? 'modo estático' : 'reanudar') : 'pausar';
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    if (!dialog.open) dialog.showModal();
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
  }

  function close() {
    running = false;
    cancelAnimationFrame(raf);
    keys.left = keys.right = false;
    if (dialog.open) dialog.close();
  }

  function togglePause() {
    if (lives <= 0) {
      reset();
      paused = false;
      lastTs = 0;
      pauseBtn.textContent = 'pausar';
      pauseBtn.setAttribute('aria-pressed', 'false');
      return;
    }
    if (reduce) return;
    paused = !paused;
    pauseBtn.textContent = paused ? 'reanudar' : 'pausar';
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
  }

  pauseBtn.onclick = togglePause;
  closeBtn.onclick = close;

  function movePaddleToClientX(clientX: number) {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (clientX - rect.left) * scale - paddle.w / 2;
    paddle.x = Math.max(8, Math.min(canvas.width - paddle.w - 8, x));
  }

  canvas.onpointermove = (e) => {
    if (!running || paused || reduce) return;
    movePaddleToClientX(e.clientX);
  };
  canvas.onpointerdown = (e) => {
    if (!running || reduce) return;
    canvas.setPointerCapture(e.pointerId);
    movePaddleToClientX(e.clientX);
  };

  if (!booted) {
    booted = true;
    document.addEventListener('debugsito:arcade-open', () => open());
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-arcade-open]')) {
        e.preventDefault();
        open();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (!running || !dialog.open) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    });
  }
}
