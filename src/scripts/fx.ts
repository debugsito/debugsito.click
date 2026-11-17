/** Pointer spotlight + mesh parallax + subtle tilt. Respects reduced motion. */

export function bootFx() {
  const stage = document.querySelector<HTMLElement>('[data-pointer-stage]');
  const mesh = document.querySelector<HTMLElement>('.atmosphere');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!stage) return;

  const onMove = (e: PointerEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    stage.style.setProperty('--mouse-x', `${x}%`);
    stage.style.setProperty('--mouse-y', `${y}%`);
    stage.style.setProperty('--inner-size', '160px');
    stage.style.setProperty('--outer-size', '260px');

    if (reduce || !mesh) return;
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    mesh.style.translate = `${nx * -18}px ${ny * -12}px`;
  };

  document.addEventListener('pointermove', onMove, { passive: true });

  if (reduce) return;

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    el.onpointermove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.rotate = `${px * 3.5}deg`;
      el.style.translate = `${px * 5}px ${py * 4}px`;
    };
    el.onpointerleave = () => {
      el.style.rotate = '0deg';
      el.style.translate = '0 0';
    };
  });
}
