import { animate, inView, stagger } from 'motion';
import { bootFx } from './fx';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let filtersWired = false;

function applyLangFilter(lang: string) {
  const chips = document.querySelectorAll<HTMLButtonElement>('[data-lang-chip]');
  const cards = document.querySelectorAll<HTMLElement>('[data-lang]');
  const empty = document.querySelector<HTMLElement>('[data-oss-empty]');
  let visible = 0;

  chips.forEach((c) => {
    c.setAttribute('aria-pressed', c.dataset.langChip === lang ? 'true' : 'false');
  });

  cards.forEach((card) => {
    const match = lang === 'all' || card.dataset.lang === lang;
    card.classList.toggle('is-out', !match);
    card.toggleAttribute('hidden', !match);
    if (match) visible += 1;
  });

  if (empty) empty.hidden = visible > 0;
}

function wireFilters() {
  if (filtersWired) return;
  filtersWired = true;
  document.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-lang-chip]');
    if (!chip) return;
    e.preventDefault();
    applyLangFilter(chip.dataset.langChip || 'all');
  });
}

export function bootHomebase() {
  bootFx();
  wireFilters();
  applyLangFilter(
    document.querySelector<HTMLButtonElement>('[data-lang-chip][aria-pressed="true"]')?.dataset
      .langChip || 'all',
  );

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
}

bootHomebase();
document.addEventListener('astro:page-load', bootHomebase);
