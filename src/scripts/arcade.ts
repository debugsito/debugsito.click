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
  let lives = 3;
  let paddle = { x: canvas.width / 2 - 36, w: 72, h: 10 };
  let packets: Packet[] = [];
  let spawn = 0;
  const keys = { left: false, right: false };

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
    ctx.fillRect(paddle.x, canvas.height - 22, paddle.w, paddle.h);
    for (const p of packets) {
      ctx.beginPath();
      ctx.fillStyle = p.good ? '#3dba8a' : '#e07070';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#9aa0a8';
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(`vidas ${lives}`, 12, 18);
    if (paused) {
      ctx.fillStyle = 'rgba(13,18,24,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#eceae4';
      ctx.fillText(lives <= 0 ? 'game over · reiniciar' : 'pausado', canvas.width / 2 - 70, canvas.height / 2);
    }
  }

  function reset() {
    score = 0;
    lives = 3;
    packets = [];
    spawn = 0;
    paddle.x = canvas.width / 2 - paddle.w / 2;
    scoreEl.textContent = 'score 0';
  }

  function step(ts: number) {
    if (!running) return;
    if (!paused && !reduce) {
      if (keys.left) paddle.x = Math.max(8, paddle.x - 5.5);
      if (keys.right) paddle.x = Math.min(canvas.width - paddle.w - 8, paddle.x + 5.5);
      if (ts - spawn > 700) {
        spawn = ts;
        packets.push({
          x: 24 + Math.random() * (canvas.width - 48),
          y: -10,
          v: 1.6 + Math.random() * 2.2 + Math.min(score / 40, 2),
          good: Math.random() > 0.32,
          r: 6 + Math.random() * 3,
        });
      }
      const next: Packet[] = [];
      for (const p of packets) {
        p.y += p.v;
        const hit =
          p.y + p.r >= canvas.height - 22 &&
          p.x >= paddle.x &&
          p.x <= paddle.x + paddle.w;
        if (hit) {
          if (p.good) {
            score += 1;
            scoreEl.textContent = `score ${score}`;
          } else lives -= 1;
          continue;
        }
        if (p.y - p.r > canvas.height) {
          if (p.good) lives -= 1;
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
      // static demo frame when reduced motion
      if (packets.length === 0) {
        packets = [
          { x: 120, y: 80, v: 0, good: true, r: 7 },
          { x: 280, y: 140, v: 0, good: false, r: 7 },
        ];
      }
    }
    draw();
    raf = requestAnimationFrame(step);
  }

  function open() {
    reset();
    paused = reduce;
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
