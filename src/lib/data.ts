import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';

const dataDir = join(process.cwd(), 'src/data');

function readYaml<T>(name: string): T {
  return load(readFileSync(join(dataDir, name), 'utf8')) as T;
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(dataDir, name), 'utf8')) as T;
}

export type Profile = {
  name: string;
  handle: string;
  role: string;
  location: string;
  tagline: string;
  summary: string;
  email: string;
  linkedin: string;
  github: string;
  education: { institution: string; area: string }[];
  live_checks: { id: string; label: string; url: string }[];
};

export type Project = {
  id: string;
  name: string;
  url: string | null;
  repo: string;
  status: 'live' | 'self-hosted';
  blurb: string;
};

export type Repo = {
  id: string;
  name: string;
  repo: string;
  url: string;
  blurb: string;
};

export type Publication = {
  title: string;
  authors: string[];
  date: string;
  venue: string;
  url: string;
  summary: string;
};

export type TimelineItem = {
  year: number;
  kind: 'work' | 'github' | 'pub';
  title: string;
  detail: string;
};

export type Cert = {
  id: string;
  org: string;
  name: string;
  code: string;
  start: string;
  exam: string;
  status: 'pending' | 'in_progress' | 'earned';
};

export type GithubGenerated = {
  fetched_at: string | null;
  repos: {
    name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
    created_at: string;
    topics: string[];
  }[];
};

export type StatusGenerated = {
  fetched_at: string | null;
  checks: {
    id: string;
    label: string;
    url: string;
    ok: boolean;
    http_status: number;
  }[];
};

export const profile = readYaml<Profile>('profile.yaml');
export const projects = readYaml<Project[]>('projects.yaml');
export const repos = readYaml<Repo[]>('repos.yaml');
export const publications = readYaml<Publication[]>('publications.yaml');
export const timeline = readYaml<TimelineItem[]>('timeline.yaml');
export const certs = readJson<Cert[]>('certs.json');
export const github = readJson<GithubGenerated>('generated/github.json');
export const status = readJson<StatusGenerated>('generated/status.json');

export const statusLabel: Record<Cert['status'], string> = {
  pending: 'pendiente',
  in_progress: 'en curso',
  earned: 'obtenida',
};

/** Etiqueta temporal honesta: si el examen ya pasó y sigue in_progress, no fingimos futuro. */
export function certScheduleLabel(c: Cert, today = new Date()): string {
  const exam = new Date(`${c.exam}T23:59:59-05:00`);
  if (c.status === 'earned') return `obtenida · ${c.exam}`;
  if (c.status === 'in_progress' && exam < today) {
    return `rendido ${c.exam} · resultado pendiente de confirmar`;
  }
  if (c.status === 'in_progress') return `examen ${c.exam}`;
  return `planificado ${c.exam}`;
}
