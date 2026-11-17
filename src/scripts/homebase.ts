import { animate, inView, stagger } from 'motion';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function bootHomebase() {
  const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!reduce) {
    reveals.forEach((el) => {
      if (el.dataset.revealed === '1') return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
    });
    inView(
      '[data-reveal]',
      (element) => {
        const el = element as HTMLElement;
        if (el.dataset.revealed === '1') return;
        el.dataset.revealed = '1';
        animate(
          el,
          { opacity: 1, y: 0 },
          { duration: 0.55, easing: [0.22, 1, 0.36, 1] },
        );
      },
      { margin: '0px 0px -8% 0px', amount: 0.2 },
    );
  } else {
    reveals.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  const rackRoot = document.querySelector('[data-rack]');
  const rack = document.querySelectorAll<HTMLElement>('[data-rack] .rack__unit');
  if (!reduce && rackRoot && rack.length && rackRoot.getAttribute('data-rack-done') !== '1') {
    rack.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-8px)';
    });
    inView(
      '[data-rack]',
      () => {
        if (rackRoot.getAttribute('data-rack-done') === '1') return;
        rackRoot.setAttribute('data-rack-done', '1');
        animate(
          rack,
          { opacity: 1, x: 0 },
          { delay: stagger(0.07), duration: 0.45, easing: [0.22, 1, 0.36, 1] },
        );
      },
      { amount: 0.15 },
    );
  }

  const chips = document.querySelectorAll<HTMLButtonElement>('[data-lang-chip]');
  const cards = document.querySelectorAll<HTMLElement>('[data-lang]');
  chips.forEach((chip) => {
    chip.onclick = () => {
      const lang = chip.dataset.langChip || 'all';
      chips.forEach((c) => c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
      cards.forEach((card) => {
        const match = lang === 'all' || card.dataset.lang === lang;
        card.hidden = !match;
      });
    };
  });
}

bootHomebase();
document.addEventListener('astro:page-load', bootHomebase);
