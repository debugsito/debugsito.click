# debugsito.click

Landing personal de **debugsito** (Carlos Sebastian Ramos Flores). Sitio estático Astro: presentación de lo que construyo y lo que está en producción.

## Editar contenido

| Qué | Archivo |
|---|---|
| Perfil, contacto, LEDs live | `src/data/profile.yaml` |
| Proyectos en producción | `src/data/projects.yaml` |
| Repos destacados | `src/data/repos.yaml` |
| Línea de tiempo / evolución | `src/data/timeline.yaml` |
| Publicaciones | `src/data/publications.yaml` |
| Certificaciones + **estado** (`pending` / `in_progress` / `earned`) | `src/data/certs.json` |
| /now | `src/content/now.md` |
| /changelog | `src/content/changelog.md` |
| Actividad GitHub (generado en build) | `src/data/generated/github.json` |

No publiques teléfono ni el PDF del CV aquí.

## Desarrollo

```bash
mise trust   # si hace falta
npm install
npm run dev
```

Runtime: Node fijado en `mise.local.toml`.

## Build y publicación

```bash
./deploy.sh
```

Hace `npm run build` (fetch de GitHub + OG + Astro) y `rsync` a `debugsito:~/landing/web`.

En el servidor: contenedor `landing` (`~/landing/compose.yml`) en la red `homebox_default`, y el Caddy de `~/inventario` hace `reverse_proxy landing:80` para `debugsito.click` (www → apex).

### DNS (Cloudflare)

Crear en la zona `debugsito.click` (proxy naranja), misma IP de origen que `grifos`:

- `A` `@` → IP del VPS
- `A` `www` → misma IP (o `CNAME` www → `debugsito.click`)

### GitHub Actions (pendiente)

Faltaría, copiando el patrón de `grifos-lima`:

1. Llave deploy limitada con `rrsync` a `~/landing/web`.
2. Secrets `DEPLOY_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST`, `DEPLOY_USER`.
3. Workflow que ejecute build + rsync en push a `main` (y/o cron).
