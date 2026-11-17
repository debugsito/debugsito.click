/** Tiny cursor glow + spider-mesh that yields to the pointer. Respects reduced motion. */

let wired = false;
let raf = 0;
let meshBooted = false;
let targetX = 0.5;
let targetY = 0.4;
let curX = 0.5;
let curY = 0.4;

type Node = { el: SVGCircleElement; bx: number; by: number; x: number; y: number };
type Edge = { el: SVGLineElement; a: number; b: number };

function bootMesh(meshRoot: HTMLElement, reduce: boolean) {
  if (meshBooted) return;
  const svg = meshRoot.querySelector('svg.mesh');
  if (!svg) return;

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  svg.querySelectorAll<SVGCircleElement>('[data-node]').forEach((el) => {
    const bx = Number(el.getAttribute('cx'));
    const by = Number(el.getAttribute('cy'));
    nodes.push({ el, bx, by, x: bx, y: by });
  });
  svg.querySelectorAll<SVGLineElement>('[data-edge]').forEach((el) => {
    edges.push({
      el,
      a: Number(el.dataset.a),
      b: Number(el.dataset.b),
    });
  });
  if (!nodes.length) return;
  meshBooted = true;

  const vb = svg.viewBox.baseVal;
  const strength = reduce ? 0 : 78;
  const follow = reduce ? 0 : 28;

  const tick = () => {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;

    const mx = vb.x + curX * vb.width;
    const my = vb.y + curY * vb.height;
    const ox = (curX - 0.5) * follow;
    const oy = (curY - 0.5) * follow * 0.7;

    for (const n of nodes) {
      const dx = n.bx + ox - mx;
      const dy = n.by + oy - my;
      const dist = Math.hypot(dx, dy) || 1;
      const push = Math.max(0, 1 - dist / 220) * strength;
      const tx = n.bx + ox + (dx / dist) * push;
      const ty = n.by + oy + (dy / dist) * push;
      n.x += (tx - n.x) * 0.18;
      n.y += (ty - n.y) * 0.18;
      n.el.setAttribute('cx', n.x.toFixed(2));
      n.el.setAttribute('cy', n.y.toFixed(2));
    }

    for (const e of edges) {
      const a = nodes[e.a];
      const b = nodes[e.b];
      if (!a || !b) continue;
      e.el.setAttribute('x1', a.x.toFixed(2));
      e.el.setAttribute('y1', a.y.toFixed(2));
      e.el.setAttribute('x2', b.x.toFixed(2));
      e.el.setAttribute('y2', b.y.toFixed(2));
    }

    raf = requestAnimationFrame(tick);
  };

  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

export function bootFx() {
  const stage = document.querySelector<HTMLElement>('[data-pointer-stage]');
  const mesh = document.querySelector<HTMLElement>('.atmosphere');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!stage) return;

  if (mesh) bootMesh(mesh, reduce);

  if (!wired) {
    wired = true;
    document.addEventListener(
      'pointermove',
      (e) => {
        targetX = e.clientX / window.innerWidth;
        targetY = e.clientY / window.innerHeight;
        stage.style.setProperty('--mouse-x', `${targetX * 100}%`);
        stage.style.setProperty('--mouse-y', `${targetY * 100}%`);
        stage.style.setProperty('--glow-size', reduce ? '28px' : '42px');
      },
      { passive: true },
    );
  }

  if (reduce) return;

  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (coarse) return;

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    el.onpointermove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.rotate = `${px * 2.2}deg`;
      el.style.translate = `${px * 3}px ${py * 2.5}px`;
    };
    el.onpointerleave = () => {
      el.style.rotate = '0deg';
      el.style.translate = '0 0';
    };
  });
}
