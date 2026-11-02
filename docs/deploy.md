# Deploying

The build is static: `npm run build` → `dist/`. Every host needs the same single rule,
because the routes (`/districts`, `/projects/…`, `/about`) are handled in the browser:
**a path that is not a file serves `/index.html`**.

Before deploying, run `npm run check`. It exits non-zero if an office name, district id
or exclusion does not match the API, or office ledger counts, totals and source-link
fields do not reconcile, so it can gate a CI deploy:

```yaml
# .github/workflows/deploy.yml (excerpt)
- run: npm ci
- run: npm run check
- run: npm run build
```

## Cloudflare Workers (static assets)

`wrangler.jsonc` deploys `dist/` as static assets with single-page-application fallback.
No Worker code and no bindings.

```bash
# change "name" in wrangler.jsonc first
npx wrangler login
npm run deploy:cloudflare
```

Add a custom domain in the Cloudflare dashboard (Workers → your worker → Domains).

## Vercel

Import the repository. `vercel.json` sets the Vite build, `dist/` and the rewrite to
`index.html`.

For this fork's two Bukidnon deployments, use separate Vercel projects connected to the same repository and `main` branch:

| Project | Build-time setting | Config | Canonical host |
| --- | --- | --- | --- |
| Bukidnon 1st DEO | Leave `VITE_PORTAL_VARIANT` unset | `portal.config.ts` | `bettergov.transparency-portal.orvyx.online` |
| Bukidnon-wide | Set `VITE_PORTAL_VARIANT=bukidnon` for Production and Preview | `portal.bukidnon.config.ts` | `bukidnon-transparency-portal.vercel.app` until the custom DNS record is verified; then `bukidnon.transparency-portal.orvyx.online` |

Run `npm run check` and `npm run check -- --config=portal.bukidnon.config.ts` before publishing either project. Each config carries its own canonical `siteUrl`. The Bukidnon-wide search combines office queries and title matches; `/about` publishes its selection rules and one excluded line. Do not describe its totals as all projects physically located in the province.

## Netlify

Import the repository. `netlify.toml` sets the build and the 200 redirect to
`index.html`.

## GitHub Pages and plain web servers

Serve `dist/`. For the fallback, copy `dist/index.html` to `dist/404.html` (GitHub Pages),
or configure the server (nginx: `try_files $uri /index.html;`).

## Link previews

Set `siteUrl` in `portal.config.ts`. The build writes the portal's name, description and
canonical URL into `index.html`, so link previews show the right portal.

## The API host

The portal reads `https://budget.bettergov.ph` unless `api` is set in the config or
`VITE_API_BASE` is set at build time. The API is CORS-open and edge-cached, so no proxy
is needed.
