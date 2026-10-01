# Student Management System — Registry Module

Next.js (App Router) · PostgreSQL · Prisma · Tailwind · shadcn/ui

> Work in progress. See [docs/PLAN.md](docs/PLAN.md) for the build plan and [docs/DECISIONS.md](docs/DECISIONS.md) for design decisions.

## Run locally

Requirements: **Node 22+** and a PostgreSQL database. Docker is optional.

```bash
cp .env.example .env     # local-only defaults, no secrets
npm install              # also generates the Prisma client
# start a database: pick one option from the table below
npm run db:check         # optional: confirms the app can reach the database
npm run db:setup         # applies migrations and loads demo data
npm run dev              # http://localhost:3000
```

### Database

The app only reads `DATABASE_URL`. Choose whichever option suits your machine:

| Option | You need | Start it | `DATABASE_URL` in `.env` |
|---|---|---|---|
| **A. Docker** (default) | Docker | `npm run db:up` | already set in `.env.example` |
| **B. No Docker, no install** | nothing extra | `npm run db:local` (Prisma's embedded Postgres) | uncomment the Option B line in `.env` |
| **C. Your own Postgres 14+** | local Postgres, Neon, Supabase, … | — | set your own connection string |

Stop with `npm run db:down` (A) or `npm run db:local:stop` (B).

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Prisma connection string | Docker: `postgresql://sms:sms@localhost:5432/sms?schema=public` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | Only used by `docker-compose.yml` (Option A) | `sms` / `sms` / `sms` / `5432` |
| `UPLOAD_DIR` | Where uploaded assessment files are stored | `storage/uploads` |
| `MAX_UPLOAD_MB` | Upload size limit | `10` |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:up` / `db:down` | Start / stop Postgres in Docker (Option A) |
| `npm run db:local` / `db:local:stop` | Start / stop Prisma's embedded Postgres (Option B) |
| `npm run db:check` | Check the database connection |
| `npm run db:setup` | Apply migrations and load demo data (any option) |
| `npm run db:migrate` | Create/apply migrations during development |
| `npm run db:seed` | Load demo data |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npm run db:studio` | Browse data in Prisma Studio |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
