import github from '../data/generated/github.json';

export type Node =
  | { type: 'dir'; children: Record<string, Node> }
  | { type: 'file'; body: string; mode?: string }
  | { type: 'link'; target: string; hint?: string };

const repoFiles: Record<string, Node> = {};
for (const r of github.repos ?? []) {
  const stars = '★'.repeat(Math.min(r.stargazers_count, 5)) || '☆';
  repoFiles[r.name] = {
    type: 'file',
    body: [
      `# ${r.name}`,
      r.description ?? '(sin descripción en el snapshot)',
      '',
      `lang: ${r.language ?? '—'}`,
      `stars: ${r.stargazers_count} ${stars}`,
      `upd: ${r.updated_at.slice(0, 10)}`,
      `url: ${r.html_url}`,
      '',
      'tip: open ' + r.name + '  ·  o  curl ' + r.name,
    ].join('\n'),
  };
}

function dir(children: Record<string, Node>): Node {
  return { type: 'dir', children };
}

function file(body: string, mode = '-rw-r--r--'): Node {
  return { type: 'file', body, mode };
}

function link(target: string, hint?: string): Node {
  return { type: 'link', target, hint };
}

/** Virtual host: feels like a box, mirrors the site + GitHub snapshot. */
export const root: Node = dir({
  home: dir({
    debugsito: dir({
      'README.md': file(
        [
          'debugsito@lima — guest shell',
          '',
          'Esto parece un Linux. Lo es, a su manera.',
          'Muévete con cd / ls / cat. Los atajos útiles siguen vivos:',
          '  open grifos | open salarios | play | now',
          '',
          'Si algo responde raro, es el host. Si responde bien, también.',
        ].join('\n'),
      ),
      bin: dir({
        open: file('#!/bin/sh\n# wrapper → open <servicio|repo>\n', '-rwxr-xr-x'),
        play: file('#!/bin/sh\n# lanza deploy dodge\n', '-rwxr-xr-x'),
      }),
      etc: dir({
        hostname: file('debugsito.click\n'),
        os_release: file(
          'NAME="Debugsito OS"\nVERSION="0.1 (lima)"\nID=debugsito\nPRETTY_NAME="Debugsito OS 0.1 (guest)"\n',
        ),
        motd: file('guest session · rw solo en /tmp · el resto es lectura social\n'),
        passwd: file('debugsito:x:1000:1000:Carlos Ramos:/home/debugsito:/bin/zsh\nguest:x:1001:1001:curious visitor:/home/debugsito:/bin/zsh\n'),
      }),
      prod: dir({
        grifos: file(
          [
            'Grifos Lima — live',
            'url: https://grifos.debugsito.click',
            'repo: debugsito/grifos-lima',
            '',
            'Mapa de combustible en Lima/Callao.',
            'atajo: open grifos',
          ].join('\n'),
        ),
        salarios: file(
          [
            'Estimación salarial — live',
            'url: https://salarios.debugsito.click',
            'repo: debugsito/tech-salary-prediction',
            '',
            'Prototipo de tesis (ESAN) con SHAP.',
            'atajo: open salarios',
          ].join('\n'),
        ),
        homebox: file(
          [
            'homebox-mcp — self-hosted',
            'repo: debugsito/homebox-mcp',
            '',
            'Inventario de la casa por Telegram/MCP.',
            'No tiene URL pública. A propósito.',
          ].join('\n'),
        ),
        'STATUS.txt': file(
          'grifos     up\nsalarios   up\nhomebox    lan-only\n(comprobado en el último build, no es un ping en vivo)\n',
        ),
      }),
      repos: dir(repoFiles),
      www: dir({
        index: link('/#', 'homebase'),
        rack: link('/#produccion', 'rack en producción'),
        bitacora: link('/#bitacora', 'journalctl — bitácora'),
        opensource: link('/#opensource', 'repos'),
        papers: link('/#publicaciones', 'springer'),
        contacto: link('/#contacto', 'canal'),
        now: link('/now', 'qué hay ahora'),
        changelog: link('/changelog', 'log del sitio'),
      }),
      secrets: dir({
        '.env': file(
          [
            '# almost',
            'AWS_SECRET_ACCESS_KEY=looks_real_but_isnt',
            'GITHUB_TOKEN=ghp_thisIsNotAToken',
            'FLAG=nice_try_guest',
            '',
            '# los secretos de verdad no viven en el browser.',
            '# (sí, también lo documenté en un paper de Springer.)',
          ].join('\n'),
          '-rw-------',
        ),
        'README.hint': file('si encontraste .env: felicidades, leíste un señuelo.\n'),
      }),
      tmp: dir({
        '.keep': file(''),
      }),
      '.gitconfig': file('[user]\n\tname = debugsito\n\temail = csramosflores@gmail.com\n'),
      '.ssh': dir({
        'authorized_keys': file('# vacío a propósito. esta shell no abre puertas.\n', '-rw-------'),
        'id_ed25519': file('-----BEGIN OPENSSH PRIVATE KEY-----\n(redacted — el guest no se lleva la llave)\n-----END OPENSSH PRIVATE KEY-----\n', '-rw-------'),
      }),
    }),
  }),
  proc: dir({
    version: file('Debugsito OS version 0.1 (guest tty)\n'),
    loadavg: file('0.13 0.09 0.07 1/42 1337\n'),
    cpuinfo: file('processor\t: 0\nmodel name\t: overcaffeinated devops\nbugs\t\t: speculative execution of side projects\n'),
  }),
  var: dir({
    log: dir({
      syslog: file(
        [
          'nov 17 02:00:01 debugsito kernel: guest landed',
          'nov 17 02:00:02 debugsito systemd: Started shell.dock.service',
          'nov 17 02:00:03 debugsito audit: someone typed sudo (logged, ignored)',
        ].join('\n') + '\n',
      ),
    }),
  }),
  etc: dir({
    hostname: file('debugsito.click\n'),
  }),
});

export const HOME = '/home/debugsito';

export function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function resolvePath(cwd: string, input: string): string {
  const raw = input.startsWith('~') ? HOME + input.slice(1) : input;
  const base = raw.startsWith('/') ? raw : cwd.replace(/\/?$/, '/') + raw;
  const parts: string[] = [];
  for (const p of splitPath(base)) {
    if (p === '.') continue;
    if (p === '..') parts.pop();
    else parts.push(p);
  }
  return '/' + parts.join('/');
}

export function getNode(abs: string): Node | null {
  if (abs === '/') return root;
  let cur: Node = root;
  for (const p of splitPath(abs)) {
    if (cur.type !== 'dir') return null;
    const next = cur.children[p];
    if (!next) return null;
    cur = next;
  }
  return cur;
}

export function listDir(abs: string): string[] | null {
  const n = getNode(abs);
  if (!n || n.type !== 'dir') return null;
  return Object.keys(n.children).sort((a, b) => a.localeCompare(b));
}

export function shortHome(path: string): string {
  if (path === HOME) return '~';
  if (path.startsWith(HOME + '/')) return '~' + path.slice(HOME.length);
  return path;
}

export function repoByName(name: string) {
  return (github.repos ?? []).find((r) => r.name === name || r.name === name.replace(/\/$/, ''));
}

export function services(): Record<string, string> {
  return {
    grifos: 'https://grifos.debugsito.click',
    salarios: 'https://salarios.debugsito.click',
  };
}
