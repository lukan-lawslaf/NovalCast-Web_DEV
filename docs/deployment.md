# NovelCast deployment

## Render backend

- Workspace `Trip AI` (`tea-dbf2vt4s728c73du5cj0`), service [`novelcast-api`](https://dashboard.render.com/web/srv-dbur870m7kps73d8pkmg) (`srv-dbur870m7kps73d8pkmg`), Free compute in Singapore.
- Source `lukan-lawslaf/NovalCast-Web_DEV`, branch `main`, root `backend`. Git pushes to `main` can trigger automatic deploys.
- Node `24.18.0`. Build with `npm ci --omit=dev` and start with `node --env-file=/etc/secrets/novelcast.env index.js`. The health check at `/api/health` requires an Atlas connection.
- Render stores `MONGODB_URI`, `FISH_AUDIO_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` in the service's secret file. Ingestion stays disabled while `INGEST_ADMIN_TOKEN` is unset.
- `MONGODB_DB_NAME=test` points to the existing Atlas catalog. `LIBRARY_STORE=atlas` stores private libraries in the same database, in `account_libraries`. The service reconnects to Atlas after a restart. Any database recovery should restore that database and collection from an authorized Atlas backup. Local JSON library files require a separate, authorized import.
- In Atlas Network Access, allow the exact CIDR ranges from Render's **Connect → Outbound** tab for this service. Once those ranges are active, retry the Render deploy and confirm `/api/health` returns `200` with `database: connected`.

## Vercel frontend

- Use the repository root with `vercel.json`. The build generates public Supabase configuration with `npm run generate:env -- --production` and publishes `frontend/`. It uses the checked-in stylesheet and needs no dependency install.
- Set `SUPABASE_URL` and either `SUPABASE_PUBLISHABLE_KEY` or the public `SUPABASE_ANON_KEY`. The frontend calls `/api`, which Vercel proxies to Render. SPA routes use hash URLs, such as `/#/search` and `/#/login`.
- In the existing NovelCast Supabase project's URL Configuration, register the production origin as the Site URL and allow its `/#/login?confirmed=true` callback. Preserve existing local development redirects.
- The first catalog request after Render idles can take about a minute while the Free instance starts. The catalog keeps loading and retries transient gateway failures.

## Experience release

- Public page [NovelCast Experience](https://novelcast.vercel.app/#/experience).
- Vercel project `novelcast` in `nakulf2007-2371s-projects`. Production deployment `dpl_6bTcsvJFhHReQDhgw3WGc6KN59ro` was published with the CLI from commit `5169a54`. GitHub pushes do not automatically publish this frontend.
- Render deployment `dep-dc0r75nb9u1s73brglh0` continues to serve the film API. The Experience release changed only the frontend. The public site's `/api/health` returned HTTP 200 with Atlas connected.
