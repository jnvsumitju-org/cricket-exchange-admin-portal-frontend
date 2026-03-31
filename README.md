# IPL Trader — Admin portal

Next.js app for exchange operators: dashboards and admin APIs behind JWT + `isAdmin` (including suspend, order cancel, player limit edits, metrics, and CSV export on several pages).

## Prerequisites

- Exchange **backend** running (default `http://localhost:4000`) with Postgres migrated and seeded.
- An **admin** user created via the backend seed. Set `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` in the backend environment, then run `npx prisma db seed` from the `exchange-backend` directory (see the repository root `README.md` for full stack setup).

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- **`NEXT_PUBLIC_API_URL`** — Exchange API base URL (no trailing slash), e.g. `http://localhost:4000`.
- **`NEXT_PUBLIC_CRICKET_DATA_URL`** (optional) — If set, the **Status** page also calls `GET {base}/health` on the cricket data / mock service.

## Run locally

```bash
npm run dev
```

Dev server listens on **port 3001** (`next dev -p 3001`): open `http://localhost:3001`.

Sign in with the seeded admin email and password. Non-admin tokens receive **403** on `/admin/*` routes.

## Production build

```bash
npm run build
```

The admin UI uses the same JWT as the main app for authenticated routes (`/market/*`, `/leagues`, `/admin/*`). Public checks use `GET /health` on the exchange (and optionally on the cricket data service) without auth.

Mutating admin calls send an `Idempotency-Key` header (via `apiFetch`) so retries are safe. On the API, enable **`ADMIN_ALLOW_REDIS_QUEUE_INSPECT=true`** if the **Status** page should show match-queue depth (`GET /admin/ops/match-queue`).
