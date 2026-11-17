#!/usr/bin/env bash
# Build local + rsync a debugsito:~/landing/web
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${DEPLOY_HOST:-debugsito}"
REMOTE="${DEPLOY_REMOTE:-~/landing/web}"

cd "$ROOT"
npm run build

# Bust de caché de Cloudflare en assets hasheados por Astro no hace falta;
# para HTML forzamos sync reciente.
rsync -avz --delete \
  --exclude '.git' \
  "$ROOT/dist/" \
  "${HOST}:${REMOTE}/"

echo "Publicado en ${HOST}:${REMOTE}"
echo "Comprueba https://debugsito.click (DNS + Caddy deben estar listos)."
