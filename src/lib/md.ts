import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readContent(name: string): string {
  return readFileSync(join(process.cwd(), 'src/content', name), 'utf8');
}

export function splitFrontmatter(raw: string): { front: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { front: {}, body: raw.trim() };
  const front = Object.fromEntries(
    match[1]
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(':');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  return { front, body: match[2].trim() };
}
