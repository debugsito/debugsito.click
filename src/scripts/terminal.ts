import {
  HOME,
  getNode,
  listDir,
  repoByName,
  resolvePath,
  services,
  shortHome,
  type Node,
} from './term-world';

let wired = false;
let cwd = HOME;
let history: string[] = [];

export function bootTerminal() {
  const dock = document.querySelector<HTMLElement>('[data-term-dock]');
  const panel = document.getElementById('term');
  const out = document.getElementById('term-out');
  const form = document.getElementById('term-form') as HTMLFormElement | null;
  const input = document.getElementById('term-input') as HTMLInputElement | null;
  const cwdEl = document.querySelector<HTMLElement>('[data-term-cwd]');
  if (!dock || !panel || !out || !form || !input) return;

  function syncCwd() {
    if (cwdEl) cwdEl.textContent = shortHome(cwd);
    input.placeholder = shortHome(cwd);
  }

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
    if (open && !out.textContent) {
      out.textContent = 'Debugsito OS · guest@lima · type help\n';
    }
    if (open) {
      out.scrollTop = out.scrollHeight;
      queueMicrotask(() => input.focus());
    }
  }

  function expand() {
    setExpanded(true);
    queueMicrotask(() => input.focus());
  }

  function collapse() {
    setExpanded(false);
  }

  function toggle() {
    if (isExpanded()) collapse();
    else expand();
  }

  function print(line = '') {
    if (!isExpanded()) setExpanded(true);
    out.textContent += line + '\n';
    out.scrollTop = out.scrollHeight;
  }

  function printBlock(text: string) {
    if (!isExpanded()) setExpanded(true);
    out.textContent += text.replace(/\n?$/, '\n');
    out.scrollTop = out.scrollHeight;
  }

  function helpText() {
    return [
      'guest shell — útil, con personalidad',
      '',
      'moverse     ls  cd  pwd  tree  cat  head  less',
      'sistema    whoami  uname  hostname  date  uptime  free  df  ps',
      'cloud      repos  open <svc|repo>  curl <repo>  git status',
      'sitio      now  changelog  play  open grifos|salarios',
      'ai         ask <pregunta>  ·  nano (status Chrome Prompt API)',
      'misc       clear  history  fortune  neofetch  man <cmd>',
      '',
      'empieza:  ls  ·  cd prod  ·  open grifos  ·  ask qué hay en el rack?',
    ].join('\n');
  }

  function readFile(node: Node): string {
    if (node.type === 'file') return node.body;
    if (node.type === 'link') return `→ ${node.target}${node.hint ? '  (' + node.hint + ')' : ''}\n`;
    return '';
  }

  function lsLong(abs: string, name: string, node: Node): string {
    if (node.type === 'dir') return `drwxr-xr-x  guest guest     - ${name}/`;
    if (node.type === 'link') return `lrwxrwxrwx  guest guest     - ${name} -> ${node.target}`;
    const mode = node.mode ?? '-rw-r--r--';
    const size = String(node.body.length).padStart(5);
    return `${mode}  guest guest ${size} ${name}`;
  }

  function cmdLs(args: string[]) {
    const long = args.includes('-l') || args.includes('-la') || args.includes('-al');
    const all = args.includes('-a') || args.includes('-la') || args.includes('-al');
    const target = args.find((a) => !a.startsWith('-')) ?? '.';
    const abs = resolvePath(cwd, target);
    const names = listDir(abs);
    if (!names) {
      const n = getNode(abs);
      if (n && n.type !== 'dir') {
        print(target.replace(/\/$/, '').split('/').pop() || target);
        return;
      }
      print(`ls: ${target}: No such file or directory`);
      return;
    }
    const shown = all ? ['.', '..', ...names] : names;
    if (!long) {
      print(
        shown
          .map((n) => {
            if (n === '.' || n === '..') return n;
            const child = getNode(resolvePath(abs, n));
            if (child?.type === 'dir') return n + '/';
            if (child?.type === 'link') return n + '@';
            return n;
          })
          .join('  '),
      );
      return;
    }
    for (const n of shown) {
      if (n === '.') {
        print(lsLong(abs, '.', getNode(abs)!));
        continue;
      }
      if (n === '..') {
        print('drwxr-xr-x  guest guest     - ../');
        continue;
      }
      const child = getNode(resolvePath(abs, n));
      if (child) print(lsLong(abs, n, child));
    }
  }

  function cmdCd(args: string[]) {
    const target = args[0] ?? '~';
    const abs = resolvePath(cwd, target === '~' ? HOME : target);
    const n = getNode(abs);
    if (!n) {
      print(`cd: ${target}: No such file or directory`);
      return;
    }
    if (n.type === 'link') {
      print(`cd: ${target}: es un link a ${n.target} — prueba: open ${target}`);
      return;
    }
    if (n.type !== 'dir') {
      print(`cd: ${target}: Not a directory`);
      return;
    }
    cwd = abs;
    syncCwd();
  }

  function cmdCat(args: string[], lines?: number) {
    if (!args[0]) {
      print('cat: missing operand');
      return;
    }
    const abs = resolvePath(cwd, args[0]);
    const n = getNode(abs);
    if (!n) {
      print(`cat: ${args[0]}: No such file or directory`);
      return;
    }
    if (n.type === 'dir') {
      print(`cat: ${args[0]}: Is a directory`);
      return;
    }
    let body = readFile(n);
    if (lines != null) body = body.split('\n').slice(0, lines).join('\n') + '\n';
    printBlock(body);
  }

  function cmdTree(abs: string, prefix = '', depth = 0) {
    if (depth > 3) return;
    const names = listDir(abs);
    if (!names) return;
    names.forEach((name, i) => {
      const last = i === names.length - 1;
      const branch = last ? '└── ' : '├── ';
      const childAbs = resolvePath(abs, name);
      const child = getNode(childAbs);
      const mark = child?.type === 'dir' ? '/' : child?.type === 'link' ? '@' : '';
      print(prefix + branch + name + mark);
      if (child?.type === 'dir') {
        cmdTree(childAbs, prefix + (last ? '    ' : '│   '), depth + 1);
      }
    });
  }

  function preview(detail: {
    title: string;
    blurb: string;
    url: string;
    kicker?: string;
    image?: string;
  }) {
    print(`preview ${detail.url}`);
    document.dispatchEvent(new CustomEvent('debugsito:open-preview', { detail }));
  }

  function openTarget(name: string) {
    const svc = services();
    if (name === 'grifos' && svc.grifos) {
      preview({
        title: 'Grifos Lima',
        blurb: 'Mapa de precios de combustible en Lima y Callao.',
        url: svc.grifos,
        kicker: 'prod · live',
        image: '/shots/grifos.webp',
      });
      return;
    }
    if (name === 'salarios' && svc.salarios) {
      preview({
        title: 'Estimación salarial',
        blurb: 'Prototipo de tesis (ESAN) con SHAP y auditoría de equidad.',
        url: svc.salarios,
        kicker: 'prod · live',
        image: '/shots/salarios.webp',
      });
      return;
    }
    if (svc[name]) {
      preview({ title: name, blurb: 'Servicio en el rack.', url: svc[name], kicker: 'prod' });
      return;
    }
    const repo = repoByName(name);
    if (repo) {
      preview({
        title: repo.name,
        blurb: repo.description ?? 'Repo público en el snapshot de GitHub.',
        url: repo.html_url,
        kicker: `github · ${repo.language ?? 'code'} · ★ ${repo.stargazers_count}`,
      });
      return;
    }
    const abs = resolvePath(cwd, name);
    const n = getNode(abs);
    if (n?.type === 'link') {
      if (n.target.startsWith('/') || n.target.startsWith('#')) {
        print(`opening ${n.target} …`);
        location.href = n.target;
        return;
      }
      preview({
        title: name,
        blurb: n.hint ?? 'link',
        url: n.target,
        kicker: 'link',
      });
      return;
    }
    print(`open: desconocido «${name}» — prueba: open grifos | open salarios | ls ~/repos`);
  }

  async function run(raw: string) {
    const trimmed = raw.trim();
    print(`guest:${shortHome(cwd)}$ ${raw}`);
    if (!trimmed) return;
    history.push(trimmed);
    if (history.length > 40) history.shift();

    const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((p) => p.replace(/^"|"$/g, '')) ?? [];
    const bin = (parts[0] || '').toLowerCase();
    const args = parts.slice(1);

    switch (bin) {
      case 'help':
      case '?':
        printBlock(helpText());
        break;
      case 'nano':
      case 'ai': {
        const { chromeAiStatus } = await import('./chrome-ai');
        const st = await chromeAiStatus();
        print(`chrome built-in AI · ${st.state}`);
        print(st.detail);
        if (st.ok) print('uso: ask qué proyectos tienes en producción?');
        break;
      }
      case 'ask': {
        const q = args.join(' ').trim();
        if (!q) {
          print('uso: ask <pregunta sobre este sitio>');
          break;
        }
        print('… consultando Gemini Nano (on-device)');
        try {
          const { chromeAiAsk } = await import('./chrome-ai');
          const answer = await chromeAiAsk(q);
          printBlock(answer || '(sin respuesta)');
        } catch (err) {
          print(`ask: ${err instanceof Error ? err.message : String(err)}`);
          print('tip: Chrome 148+ desktop · chrome://on-device-internals');
        }
        break;
      }
      case 'man':
        if (!args[0]) print('qué manual?  man ls');
        else if (['ls', 'cd', 'cat', 'open', 'sudo', 'rm'].includes(args[0]))
          print(`${args[0]}(1) — funciona aquí. el resto es folklore educado.`);
        else print(`no manual entry for ${args[0]}`);
        break;
      case 'ls':
        cmdLs(args);
        break;
      case 'cd':
        cmdCd(args);
        break;
      case 'pwd':
        print(cwd);
        break;
      case 'cat':
      case 'less':
      case 'more':
        cmdCat(args);
        break;
      case 'head':
        cmdCat(args, 8);
        break;
      case 'tail':
        if (!args[0]) print('tail: missing operand');
        else {
          const abs = resolvePath(cwd, args[0]);
          const n = getNode(abs);
          if (!n || n.type === 'dir') print(`tail: ${args[0]}: error`);
          else {
            const lines = readFile(n).trimEnd().split('\n');
            printBlock(lines.slice(-8).join('\n') + '\n');
          }
        }
        break;
      case 'tree':
        print('.');
        cmdTree(args[0] ? resolvePath(cwd, args[0]) : cwd);
        break;
      case 'find': {
        const start = resolvePath(cwd, args[0] && !args[0].startsWith('-') ? args[0] : '.');
        const walk = (abs: string) => {
          print(abs);
          const names = listDir(abs);
          if (!names) return;
          for (const n of names) walk(resolvePath(abs, n));
        };
        if (!getNode(start)) print(`find: ${args[0] ?? '.'}: No such file or directory`);
        else walk(start);
        break;
      }
      case 'whoami':
        print('guest');
        print('# en el curriculum: Carlos Sebastian Ramos Flores · debugsito');
        break;
      case 'id':
        print('uid=1001(guest) gid=1001(guest) groups=1001(guest),42(curious)');
        break;
      case 'hostname':
        print('debugsito.click');
        break;
      case 'uname':
        if (args.includes('-a')) print('DebugsitoOS lima 0.1-guest #1 SMP PREEMPT_DYNAMIC Lima');
        else print('DebugsitoOS');
        break;
      case 'date':
        print(new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }) + ' -05 (America/Lima)');
        break;
      case 'uptime':
        print('up too many side projects,  1 user,  load average: 0.13, 0.09, 0.07');
        break;
      case 'free':
        print('              total        used        free');
        print('Mem:       16G coffee    15G tabs    1G focus');
        break;
      case 'df':
        print('Filesystem      Size  Used Avail Use% Mounted on');
        print('overlay         42G   13G   29G  31% /');
        print('sanity          1.0G  980M   20M  98% /home/debugsito/focus');
        break;
      case 'ps':
        print('USER       PID %CPU CMD');
        print('guest        1  0.0 /sbin/init');
        print('guest       42  1.2 shell.dock');
        print('guest      217  0.4 arcade (sleeping)');
        print('guest      512  3.1 browser-tabs --count=too-many');
        break;
      case 'top':
        print('top - guest view — press q mentally');
        print('Tasks: 3 useful, 12 decorative, 1 arcade');
        print('%Cpu: 12.0 us,  3.0 sy, 85.0 idle (scrolling)');
        break;
      case 'kill':
      case 'killall':
        print('kill: permission denied (el guest no mata procesos, solo curiosidad)');
        break;
      case 'sudo':
        print('guest is not in the sudoers file. This incident will be reported to /var/log/syslog.');
        print('# spoiler: el log también es de mentira, pero el rechazo es real.');
        break;
      case 'su':
        print('su: Authentication failure');
        break;
      case 'rm':
        if (args.some((a) => a.includes('/')) || args.includes('-rf') || args.includes('-fr'))
          print('rm: refusing to touch the host. /tmp es tu sandbox (cd /tmp).');
        else print('rm: read-only filesystem (esta caja es de lectura social)');
        break;
      case 'mkdir':
      case 'touch':
      case 'mv':
      case 'cp':
        print(`${bin}: read-only filesystem — excepto /tmp, y /tmp olvida todo al recargar`);
        break;
      case 'echo':
        print(args.join(' '));
        break;
      case 'history':
        history.forEach((h, i) => print(` ${i + 1}  ${h}`));
        break;
      case 'clear':
        out.textContent = '';
        break;
      case 'exit':
      case 'q':
      case 'logout':
        collapse();
        break;
      case 'play':
        document.dispatchEvent(new CustomEvent('debugsito:arcade-open'));
        break;
      case 'now':
        location.href = '/now';
        break;
      case 'changelog':
        location.href = '/changelog';
        break;
      case 'open':
        if (!args[0]) print('uso: open grifos|salarios|<repo>');
        else openTarget(args[0]);
        break;
      case 'curl':
      case 'wget': {
        const name = (args.find((a) => !a.startsWith('-')) || '').replace(/^https?:\/\/(www\.)?github.com\/debugsito\//, '');
        if (!name) {
          print(`${bin}: prueba curl grifos-lima  o  curl claude-toolkit`);
          break;
        }
        if (services()[name]) {
          print(`HTTP/1.1 302 → ${services()[name]}`);
          print('(usa open ' + name + ' para ir)');
          break;
        }
        const repo = repoByName(name);
        if (repo) {
          print(`HTTP/1.1 200 OK`);
          print(`content-type: application/vnd.github+json`);
          print(`x-snapshot: build-time`);
          print('');
          print(JSON.stringify({ name: repo.name, stars: repo.stargazers_count, lang: repo.language, url: repo.html_url }, null, 2));
        } else print(`${bin}: no encontrado en el snapshot — ls ~/repos`);
        break;
      }
      case 'git':
        if (args[0] === 'status') {
          print('On branch main');
          print('Your branch is up to date with \'origin/main\'.');
          print('nothing to commit, working tree clean');
          print('# (en el browser no hay working tree. hay snapshot.)');
        } else if (args[0] === 'log') {
          print('commit decoy (HEAD -> main)');
          print('Author: debugsito <guest@debugsito.click>');
          print('Date:   the last deploy');
          print('');
          print('    chore: keep the guest shell interesting');
        } else if (args[0] === 'clone') {
          print('git clone: en el browser no clonas; open <repo> o ls ~/repos');
        } else print('git: prueba git status | git log');
        break;
      case 'repos':
        cwd = HOME + '/repos';
        syncCwd();
        print('(cwd → ~/repos)');
        cmdLs([]);
        break;
      case 'neofetch':
      case 'fastfetch':
        printBlock(
          [
            '          .',
            '       .-+- guest@debugsito.click',
            '     .-+--- OS: Debugsito OS 0.1 (lima)',
            '   .-+----- Host: homebase / Astro SSG',
            ' .-+------- Kernel: curiosity/guest',
            '-+--------- Shell: dock zsh-ish',
            '            DE: browser',
            '            CPU: overcaffeinated devops',
            '            Memory: 15G tabs / 1G focus',
          ].join('\n'),
        );
        break;
      case 'fortune':
      case 'cowthink':
        print(
          [
            'el prod no perdona, pero el guest shell sí.',
            'OIDC > pegar secretos en el CI.',
            'si funciona en mi laptop, aún no está en prod.',
            'rm -rf / aquí solo hiere sentimientos.',
            'la bitácora no es un CV: es journalctl con filtros.',
          ][Math.floor(Math.random() * 5)],
        );
        break;
      case 'ping':
        print(`PING ${args[0] || 'debugsito.click'} (127.0.0.1): 56 data bytes`);
        print('64 bytes from localhost: icmp_seq=0 ttl=64 time=0.4 ms');
        print('# todo pasa por el browser. el ping es teatro de red.');
        break;
      case 'ssh':
        print('ssh: connection refused — esta caja ya eres tú');
        break;
      case 'docker':
      case 'kubectl':
      case 'terraform':
        print(`${bin}: instalado en la cabeza del host, no en el guest tty`);
        print('# mira ~/repos y ~/prod para lo que sí está publicado');
        break;
      default:
        print(`${bin}: command not found`);
        print('# help — o ls para mirar el filesystem');
    }
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = '';
    void run(value);
  };

  // always minimized by default
  setExpanded(false);
  syncCwd();

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

      if (e.key === 'Escape' && isExpanded()) {
        e.preventDefault();
        collapse();
        return;
      }

      if (e.key === '`' && !typing) {
        e.preventDefault();
        if (!isExpanded()) expand();
        else input.focus();
      }
    });

    document.addEventListener('debugsito:term-open', () => expand());
  }

  (window as unknown as { __debugsitoTerm?: { open: () => void; close: () => void } }).__debugsitoTerm =
    { open: () => expand(), close: collapse };
}
