#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const profile = load(readFileSync(join(root, 'src/data/profile.yaml'), 'utf8'));
const out = join(root, 'src/data/generated/status.json');

async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'debugsito.click-build' },
    });
    return { ok: res.ok || (res.status >= 200 && res.status < 400), status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

const checks = [];
for (const c of profile.live_checks || []) {
  const r = await probe(c.url);
  checks.push({
    id: c.id,
    label: c.label,
    url: c.url,
    ok: r.ok,
    http_status: r.status,
  });
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify({ fetched_at: new Date().toISOString(), checks }, null, 2) + '\n',
);
console.log(
  `fetch-status: ${checks.map((c) => `${c.label}=${c.ok ? 'up' : 'down'}`).join(' ')} → ${out}`,
);
