export type OpenPreviewDetail = {
  title: string;
  blurb: string;
  url: string;
  kicker?: string;
  image?: string;
};

let wired = false;

function els() {
  const dialog = document.getElementById('open-card') as HTMLDialogElement | null;
  if (!dialog) return null;
  return {
    dialog,
    img: dialog.querySelector<HTMLImageElement>('[data-open-img]'),
    kicker: dialog.querySelector<HTMLElement>('[data-open-kicker]'),
    title: dialog.querySelector<HTMLElement>('[data-open-title]'),
    blurb: dialog.querySelector<HTMLElement>('[data-open-blurb]'),
    url: dialog.querySelector<HTMLElement>('[data-open-url]'),
    go: dialog.querySelector<HTMLAnchorElement>('[data-open-go]'),
    dismiss: dialog.querySelector<HTMLButtonElement>('[data-open-dismiss]'),
  };
}

export function showOpenPreview(detail: OpenPreviewDetail) {
  const e = els();
  if (!e) {
    window.open(detail.url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (e.kicker) e.kicker.textContent = detail.kicker ?? 'open';
  if (e.title) e.title.textContent = detail.title;
  if (e.blurb) e.blurb.textContent = detail.blurb;
  if (e.url) e.url.textContent = detail.url.replace(/^https:\/\//, '');
  if (e.go) {
    e.go.href = detail.url;
    e.go.textContent = 'Abrir';
  }
  if (e.img) {
    if (detail.image) {
      e.img.src = detail.image;
      e.img.hidden = false;
      e.dialog.classList.add('has-media');
    } else {
      e.img.hidden = true;
      e.dialog.classList.remove('has-media');
    }
  }
  try {
    if (!e.dialog.open) e.dialog.showModal();
  } catch {
    e.dialog.setAttribute('open', '');
  }
}

export function bootOpenPreview() {
  const e = els();
  if (!e) return;

  e.dismiss?.addEventListener('click', () => {
    try {
      e.dialog.close();
    } catch {
      e.dialog.removeAttribute('open');
    }
  });
  e.go?.addEventListener('click', () => {
    try {
      e.dialog.close();
    } catch {
      e.dialog.removeAttribute('open');
    }
  });

  if (wired) return;
  wired = true;
  document.addEventListener('debugsito:open-preview', ((ev: CustomEvent<OpenPreviewDetail>) => {
    showOpenPreview(ev.detail);
  }) as EventListener);
}

export function previewOrOpen(detail: OpenPreviewDetail) {
  showOpenPreview(detail);
}
