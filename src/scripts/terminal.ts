let wired = false;

export function bootTerminal() {
  const term = document.getElementById('term');
  const out = document.getElementById('term-out');
  const form = document.getElementById('term-form') as HTMLFormElement | null;
  const input = document.getElementById('term-input') as HTMLInputElement | null;
  if (!term || !out || !form || !input) return;

  let lastOpener: HTMLElement | null = null;

  const help = `comandos:
  help                 esta ayuda
  ls                   secciones
  now | changelog      navega
  open grifos|salarios abre proyecto
  play                 mini-arcade deploy dodge
  whoami               quién soy
  clear | exit         limpia / cierra`;

  function setOpen(open: boolean) {
    term.classList.toggle('is-open', open);
    term.dataset.open = open ? 'true' : 'false';
    term.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.querySelectorAll('[data-term-open]').forEach((b) => {
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function openTerm(opener?: HTMLElement | null) {
    lastOpener = opener ?? (document.activeElement as HTMLElement | null);
    setOpen(true);
    if (!out.textContent) out.textContent = 'shell lista · help · play\n';
    queueMicrotask(() => input.focus());
  }

  function closeTerm() {
    setOpen(false);
    lastOpener?.focus?.();
  }

  function println(line: string) {
    out.textContent += line + '\n';
    out.scrollTop = out.scrollHeight;
  }

  function run(raw: string) {
    const cmd = raw.trim().toLowerCase();
    println('$ ' + raw);
    if (!cmd) return;
    if (cmd === 'help') println(help);
    else if (cmd === 'ls')
      println('produccion  evolucion  opensource  publicaciones  contacto  now  changelog  play');
    else if (cmd === 'now') location.href = '/now';
    else if (cmd === 'changelog') location.href = '/changelog';
    else if (cmd === 'whoami')
      println('Carlos Sebastian Ramos Flores · debugsito · Senior DevOps Engineer · Lima');
    else if (cmd === 'clear') out.textContent = '';
    else if (cmd === 'exit' || cmd === 'q') closeTerm();
    else if (cmd === 'play') {
      closeTerm();
      document.dispatchEvent(new CustomEvent('debugsito:arcade-open'));
    } else if (cmd.startsWith('open ')) {
      const t = cmd.slice(5).trim();
      if (t === 'grifos') location.href = 'https://grifos.debugsito.click';
      else if (t === 'salarios') location.href = 'https://salarios.debugsito.click';
      else println('uso: open grifos|salarios');
    } else println(`desconocido: ${cmd} · help`);
  }

  // Rebind form each boot (view transitions may clone nodes)
  form.onsubmit = (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  };

  if (!wired) {
    wired = true;
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('[data-term-open]')) {
        e.preventDefault();
        openTerm(t.closest('[data-term-open]') as HTMLElement);
      } else if (t.closest('[data-term-close]')) {
        e.preventDefault();
        closeTerm();
      }
    });

    document.addEventListener('keydown', (e) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      const open = term.dataset.open === 'true';

      if (e.key === 'Escape' && open) {
        e.preventDefault();
        closeTerm();
        return;
      }
      if (open && e.key === 'Tab') {
        const list = Array.from(
          term.querySelectorAll<HTMLElement>(
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
      if (typing && el !== input) return;
      if (e.key === '`' && !open) {
        e.preventDefault();
        openTerm();
      }
    });

    document.addEventListener('debugsito:term-open', () => openTerm());
  }

  // expose for arcade / others
  (window as unknown as { __debugsitoTerm?: { open: () => void; close: () => void } }).__debugsitoTerm =
    { open: () => openTerm(), close: closeTerm };
}
