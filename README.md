# Apex Finance

A four-surface product suite for a fictional Nigerian savings-and-investing app: a design case study, a marketing site, a desktop web app, and a mobile PWA. All four are live, built from this npm-workspaces monorepo, and share one design-token layer.

## Live links

| Surface | URL | What it is |
| --- | --- | --- |
| Case study | [apex-finance-case-study.vercel.app](https://apex-finance-case-study.vercel.app) | The design case study: problem, process, decisions and outcomes |
| Website | [apex-finance-website.vercel.app](https://apex-finance-website.vercel.app) | Marketing site for the product |
| Desktop app | [apex-finance-desktop.vercel.app](https://apex-finance-desktop.vercel.app) | Desktop web app demo |
| Mobile PWA | [apex-finance-mobile.vercel.app](https://apex-finance-mobile.vercel.app) | Installable mobile app demo |

The demo apps sign in with a real one-time code from the API; until an SMS gateway is configured the code is returned as `devCode` and shown on the OTP screen. No real money moves.

## Screenshots

| Case study | Marketing website |
| --- | --- |
| ![Case study hero](docs/screenshots/case-study.png) | ![Website hero](docs/screenshots/website.png) |
| **Desktop app** | **Mobile PWA** |
| ![Desktop dashboard](docs/screenshots/desktop-overview.png) | ![Mobile home screen](docs/screenshots/mobile-home.png) |

All four run the shared demo account (Ada Okafor). Also: [desktop invest screen](docs/screenshots/desktop-invest.png).

## Repository layout

```
apps/case-study   design case study
apps/website      marketing site
apps/desktop      desktop web app
apps/mobile       mobile PWA
apps/api          API + double-entry ledger (Postgres)
packages/shared   shared design tokens, components, money helpers and API types
```

## Run locally

Requires Node 20+ and npm.

```bash
npm install
npm run dev:case      # case study
npm run dev:site      # marketing site
npm run dev:desktop   # desktop app
npm run dev:mobile    # mobile app
npm run dev:api       # API on :4000 (serves the ledger, falls back to demo state without a database)
```

The two apps proxy `/api` to `http://127.0.0.1:4000` in development and to the deployed API in production, and fall back to an identical local demo state when the API is unreachable.

### Docker

The API and its Postgres also run as containers, which is the shortest path on WSL 2, Linux or macOS — no Node install needed for the backend.

```bash
docker compose up --build -d            # Postgres on :5435, API on :4000
docker compose logs -f api
curl http://127.0.0.1:4000/api/health   # {"storage":"postgres"}
docker compose run --rm api npm run -w @apex/api test
docker compose down                     # add -v to drop the database volume
```

Migrations run on start, and the demo ledger is seeded only when the database has no users yet, so restarting the stack never wipes work. The stack exposes Postgres on `APEX_DB_PORT` (default 5435) and the API on `APEX_API_PORT` (default 4000); `AUTH_SECRET` comes from a development value in `docker-compose.yml`. The four front-end apps keep running with npm on the host and proxy `/api` to `127.0.0.1:4000`, so they talk to the containerised API without changes.

## Ledger

Balances are derived from postings, never stored. Every write goes through `post_entry`, which rejects an entry whose postings do not net to zero in each currency, and postings are append-only.

```bash
npm run -w @apex/api db:init      # create the local cluster in apps/api/.pgdata (first run)
npm run -w @apex/api db:up        # start Postgres on :5433
npm run -w @apex/api db:migrate   # apply migrations/*.sql
npm run -w @apex/api db:seed      # post the demo account from packages/shared
npm run -w @apex/api test         # ledger invariants against the running database
```

The deployed API reads `DATABASE_URL` when it is set and returns the packaged seed otherwise; `GET /api/health` reports which one answered as `storage`.

Writes go through `POST /api/deposit`, `POST /api/trade` and `POST /api/plans/:id/fund`. Each returns the full `MobileStateResponse` after committing, takes an optional `reference` for idempotency, and answers failures with `{ error, message }` plus a 4xx/503 status. The desktop and mobile stores call these for the seeded demo account and keep the server's transaction; withdrawals, transfers, new plans and plan withdrawals are still local to each app.

## Accounts and sign-in

Each user is a phone number with its own ledger owner. Signing up provisions a zeroed account (wallet and external accounts in NGN and USD, plus a `new` profile) on first verification, and every read and write is scoped to the bearer token that verified it.

- `POST /api/auth/request-code` — `{ phone }` → `{ challengeId, expiresAt, devCode? }`. Codes are six digits, hashed at rest, valid for 10 minutes, max five attempts, max five per phone per 10 minutes.
- `POST /api/auth/verify-code` — `{ challengeId, code, name?, email? }` → `{ token, expiresAt, owner, state }`. Creates the user and ledger accounts the first time that phone verifies.
- `POST /api/auth/logout` with `Authorization: Bearer <token>` revokes the session.
- `GET /api/state` and the write endpoints accept the bearer token; without one they fall back to the shared demo account so the public demo still works.

Set `AUTH_SECRET` in the API environment to pepper the stored code hashes; without it a development default is used. `+234 803 555 0147` maps to the seeded demo owner; any other number gets its own account. Sessions live in `sessions` (30 days) and the token is kept in `localStorage` as `apex.session.v1`.

### SMS delivery

Set `SMS_PROVIDER` to `termii`, `twilio` or `africastalking` and the matching credentials; the code is then sent by SMS and `devCode` is omitted from the response (the apps hide the demo hint and the "Use demo code" shortcut accordingly). Without a provider the API keeps returning `devCode` so the demo can be used.

| Provider | Variables |
| --- | --- |
| Termii | `TERMII_API_KEY`, optional `TERMII_SENDER_ID` (default `N-Alert`) |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| Africa's Talking | `AT_USERNAME`, `AT_API_KEY`, optional `AT_SENDER_ID` |

An SMS failure rolls the challenge back and answers `502 sms_failed`, so the attempt does not count against the per-phone limit.

## Rate limits

Limits are stored in Postgres (`rate_limits`), so they hold across serverless instances instead of per process.

| Endpoint | Limit |
| --- | --- |
| `POST /api/auth/request-code` | 10 per IP per 10 minutes (plus the per-phone limit above) |
| `POST /api/auth/verify-code` | 40 per IP per 10 minutes (plus five quick guesses per challenge) |
| `GET /api/state` | 300 per IP per minute |
| Deposits, trades and plan funding | 30 per account and 60 per IP per minute |

Exceeding a limit answers `429 too_many_requests`. Old rows are pruned opportunistically.

## Backups

- **Point-in-time restore:** the production database is Neon. Its history retention is set in the Neon console (free plan keeps about six hours; paid plans up to 30 days) and can restore a branch to any moment inside that window.
- **Daily logical backups:** `.github/workflows/db-backup.yml` runs `pg_dump` at 02:00 UTC (and on demand) and keeps a custom-format dump as a workflow artifact for 30 days. Add a repository secret named `DATABASE_URL` with the production connection string; without it the job fails instead of uploading an empty file.
- **Restore:** `pg_restore --clean --no-owner --no-privileges --dbname "$DATABASE_URL" apex-YYYY-MM-DD.dump`. Run migrations afterwards (`npm run -w @apex/api db:migrate`) in case the dump predates them.

## Build

```bash
npm run build           # all four surfaces
npm run build:case
npm run build:site
npm run build:desktop
npm run build:mobile
```

Each app builds to its own `dist/` directory and deploys to Vercel as a static site.

### Preview deployments

Opening or updating a pull request builds a preview of every surface — the four front-end apps and the API. Vercel's GitHub integration does this automatically for the projects in `dera19`; it comments a table of ready preview URLs on the pull request, and each push replaces the previews for the previous commit. No repository secret or workflow is involved.

Two things to know:

- Preview builds call the deployed API, and the API's preview deployment reads the same database as production. Treat a pull request preview as a demo surface: writes land on the shared demo account.
- Vercel only builds previews for branches inside this repository. Pull requests from forks are not built.
