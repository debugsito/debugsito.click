const STORAGE_KEY = 'debugsito-term-expanded';

let wired = false;

export function bootTerminal() {
  const dock = document.querySelector<HTMLElement>('[data-term-dock]');
  const panel = document.getElementById('term');
  const out = document.getElementById('term-out');
  const form = document.getElementById('term-form') as HTMLFormElement | null;
  const input = document.getElementById('term-input') as HTMLInputElement | null;
  if (!dock || !panel || !out || !form || !input) return;

  const help = `comandos:
  help                 esta ayuda
  ls                   secciones
  now | changelog      navega
  open grifos|salarios abre proyecto
  play                 mini-arcade deploy dodge
  whoami               quién soy
  clear                limpia historial
  exit | q             minimiza el dock`;

  function isExpanded() {
    return dock.dataset.expanded === 'true';
  }

  function setExpanded(open: boolean) {
    dock.dataset.expanded = open ? 'true' : 'false';
    dock.classList.toggle('is-expanded', open);
    panel.hidden = !open;
    document.querySelectorAll('[data-term-toggle], [data-term-open]').forEach((b) => {
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    try {
      sessionStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (open && !out.textContent) {
      out.textContent = 'shell lista · siempre abajo · help · play\n';
    }
    if (open) {
      out.scrollTop = out.scrollHeight;
      queueMicrotask(() => input.focus());
    }
  }

  function expand(focus = true) {
    setExpanded(true);
    if (focus) queueMicrotask(() => input.focus());
  }

  function collapse() {
    setExpanded(false);
  }

  function toggle() {
    if (isExpanded()) collapse();
    else expand();
  }

  function focusDock() {
    input.focus();
  }

  function println(line: string) {
    if (!isExpanded()) setExpanded(true);
    out.textContent += line + '\n';
    out.scrollTop = out.scrollHeight;
  }

  function run(raw: string) {
    const cmd = raw.trim().toLowerCase();
    println('$ ' + raw);
    if (!cmd) return;
    if (cmd === 'help') println(help);
    else if (cmd === 'ls')
      println('produccion  bitacora  opensource  publicaciones  contacto  now  changelog  play');
    else if (cmd === 'now') location.href = '/now';
    else if (cmd === 'changelog') location.href = '/changelog';
    else if (cmd === 'whoami')
      println('Carlos Sebastian Ramos Flores · debugsito · Senior DevOps Engineer · Lima');
    else if (cmd === 'clear') out.textContent = '';
    else if (cmd === 'exit' || cmd === 'q') collapse();
    else if (cmd === 'play') {
      document.dispatchEvent(new CustomEvent('debugsito:arcade-open'));
    } else if (cmd.startsWith('open ')) {
      const t = cmd.slice(5).trim();
      if (t === 'grifos') location.href = 'https://grifos.debugsito.click';
      else if (t === 'salarios') location.href = 'https://salarios.debugsito.click';
      else println('uso: open grifos|salarios');
    } else println(`desconocido: ${cmd} · help`);
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  };

  // restore expanded preference across navigations
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') setExpanded(true);
    else setExpanded(false);
  } catch {
    setExpanded(false);
  }

  if (!wired) {
    wired = true;
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('[data-term-toggle]')) {
        e.preventDefault();
        toggle();
        return;
      }
      if (t.closest('[data-term-open]')) {
        e.preventDefault();
        expand();
        return;
      }
      if (t.closest('[data-term-collapse]') || t.closest('[data-term-close]')) {
        e.preventDefault();
        collapse();
      }
    });

    document.addEventListener('keydown', (e) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      const open = isExpanded();

      if (e.key === 'Escape' && open) {
        e.preventDefault();
        collapse();
        return;
      }

      if (open && e.key === 'Tab' && panel.contains(document.activeElement)) {
        const list = Array.from(
          dock.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled])',
          ),
        );
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.key === '`' && !typing) {
        e.preventDefault();
        if (!open) expand();
        else focusDock();
      }
    });

    document.addEventListener('debugsito:term-open', () => expand());
  }

  (window as unknown as { __debugsitoTerm?: { open: () => void; close: () => void } }).__debugsitoTerm =
    { open: () => expand(), close: collapse };
}
