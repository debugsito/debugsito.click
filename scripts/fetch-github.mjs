#!/usr/bin/env node
/**
 * Build-time: lista repos públicos recientes de debugsito.
 * Usa GH_CONFIG_DIR=~/.config/gh-personal si gh está disponible; si no, API pública.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '../src/data/generated/github.json');

const EXCLUDE = [
  /^skills-/i,
  /^PC1_/i,
  /^RamosFloresPC02$/i,
  /^prueba/i,
  /^testrick/i,
];

function excluded(name) {
  return EXCLUDE.some((re) => re.test(name));
}

function viaGh() {
  const env = {
    ...process.env,
    GH_CONFIG_DIR: process.env.GH_CONFIG_DIR || `${process.env.HOME}/.config/gh-personal`,
  };
  const raw = execFileSync(
    'gh',
    [
      'api',
      'users/debugsito/repos',
      '--paginate',
      '-q',
      '[.[] | select(.fork==false and .private==false) | {name, html_url, description, language, stargazers_count, updated_at, created_at, topics}]',
    ],
    { env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  return JSON.parse(raw);
}

async function viaFetch() {
  const res = await fetch(
    'https://api.github.com/users/debugsito/repos?per_page=100&sort=updated',
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'debugsito.click-build' } },
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  return data
    .filter((r) => !r.fork && !r.private)
    .map((r) => ({
      name: r.name,
      html_url: r.html_url,
      description: r.description,
      language: r.language,
      stargazers_count: r.stargazers_count,
      updated_at: r.updated_at,
      created_at: r.created_at,
      topics: r.topics ?? [],
    }));
}

let repos;
try {
  repos = viaGh();
} catch {
  try {
    repos = await viaFetch();
  } catch (e) {
    console.warn('fetch-github: no se pudo consultar GitHub, se deja el JSON previo.', e.message);
    process.exit(0);
  }
}

repos = (repos || [])
  .filter((r) => !excluded(r.name))
  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  .slice(0, 12);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify({ fetched_at: new Date().toISOString(), repos }, null, 2) + '\n',
);
console.log(`fetch-github: ${repos.length} repos → ${out}`);
