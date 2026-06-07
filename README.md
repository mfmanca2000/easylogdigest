# EasyLogDigest

Daily error digest tool for applications running on Loki or Elasticsearch. Pulls error logs on a schedule, deduplicates them by fingerprint, attaches AI-generated investigation hints, and emails a PDF report.

## What it does

1. **Fetches** error logs from Loki (`/loki/api/v1/query_range`) or Elasticsearch (`/_search`) for each configured App × Environment pair.
2. **Fingerprints** each log line — strips timestamps, IDs, IPs, numbers, and log-level prefixes, then SHA-256 hashes the normalized message. Identical errors from different requests collapse into one entry.
3. **Tracks novelty** — a `ErrorEntry` table persists known fingerprints per App × Env. Each run marks entries as new or recurring.
4. **Generates hints** — if `ANTHROPIC_API_KEY` is set, calls Claude Haiku for a 1-2 sentence investigation hint per unique error. Falls back to static regex rules (connection refused, timeout, OOM, auth errors, TLS, disk, rate limit, parse errors).
5. **Emails a PDF report** via SMTP with per-app attachment and an HTML summary in the email body.
6. **Runs on a cron schedule** (default `0 6 * * *` UTC) using `node-cron` inside the Next.js process. Schedule and email config are stored in the database and editable from the admin UI.

## Architecture

```
Browser ──► Next.js App Router (port 3000)
              │
              ├── /app/(app)/          ← authenticated UI (reports, admin)
              ├── /app/(auth)/login    ← credential login (NextAuth v5)
              └── /app/api/
                    ├── admin/*        ← CRUD for datasources, apps, envs, configs, users, settings
                    ├── reports/*      ← list / view / trigger reports
                    └── cron/trigger   ← HTTP endpoint to manually fire a digest run

              │
              ├── lib/digest/          ← core digest logic
              │     ├── run-digest.ts       iterates enabled AppEnvConfigs in parallel
              │     ├── process-app-env.ts  fetch → fingerprint → upsert → hint
              │     └── ai-hints.ts         Claude Haiku or static regex fallback
              │
              ├── lib/grafana/         ← log source clients
              │     ├── loki-client.ts      paginated LogQL via query_range
              │     └── elasticsearch-client.ts  paginated ES _search with search_after
              │
              ├── lib/fingerprint.ts   ← message normalization + SHA-256
              ├── lib/email/           ← nodemailer + @react-pdf/renderer
              ├── lib/cron/scheduler.ts← node-cron, re-arms on settings save
              └── lib/prisma.ts        ← Prisma client (PostgreSQL)

PostgreSQL
  ├── User / Session / Account        ← NextAuth
  ├── GrafanaDatasource               ← connection config (Loki or ES)
  ├── Application + Environment       ← logical groupings
  ├── AppEnvConfig                    ← App × Env × Datasource + query template
  ├── ErrorEntry                      ← fingerprint registry (known errors)
  ├── DailyReport + ReportEntry       ← one report per AppEnvConfig per day
  ├── EmailConfig                     ← SMTP settings
  └── ScheduleConfig                  ← cron expression + enabled flag
```

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or use the provided Docker Compose)

### 1. Clone and install

```bash
git clone <repo>
cd easylogdigest
npm install
```

### 2. Environment variables

Create a `.env` file:

```env
# Required
DATABASE_URL="postgresql://easylogdigest:easylogdigest@localhost:5432/easylogdigest"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Optional — enables Claude Haiku hints instead of static regex
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Database

```bash
# Start PostgreSQL (if using Docker)
docker compose up postgres -d

# Run migrations
npm run db:migrate

# Seed a default admin user (admin@example.com / admin123)
npm run db:seed
```

### 4. Run

```bash
npm run dev      # development
npm run build && npm run start   # production
```

### Local dev stack (Loki + Grafana + log simulator)

```bash
docker compose up -d
```

Starts PostgreSQL on `5432`, Loki on `3100`, Grafana on `3001`, and a log simulator that pushes fake errors to Loki every 30 seconds.

## Configuration (admin UI)

All config lives at `/admin`. Only users with role `ADMIN` can access it.

| Section | What to configure |
|---|---|
| **Datasources** | Add a Loki or Elasticsearch connection (URL + API key or basic auth) |
| **Applications** | Logical app names (e.g. `payment-service`) |
| **Environments** | Environment names (e.g. `production`, `staging`) |
| **App × Env Configs** | Link an App + Env to a datasource, set query template and lookback window |
| **Settings → Email** | SMTP host/port/auth + comma-separated recipient list |
| **Settings → Schedule** | Cron expression (UTC). Default: `0 6 * * *` (6:00 AM UTC daily) |
| **Users** | Create/delete users, assign ADMIN or AM role |

### Datasource URL

The "Grafana Base URL" field must point directly to the **log source**, not to Grafana's UI:

- **Loki**: `http://loki-host:3100` — the app hits `{baseUrl}/loki/api/v1/query_range`
- **Elasticsearch**: `http://es-host:9200` — the app hits `{baseUrl}/{index}/_search`

### API Key

- **Grafana Cloud Loki**: grafana.com → My Account → Security → API Keys
- **Self-hosted Grafana**: Administration → Service Accounts → Add token
- **Elasticsearch**: Kibana → Stack Management → Security → API Keys (or leave blank and use Username/Password)

### Query template

LogQL or ES query template for Loki configs. Supports `{app}` and `{env}` placeholders which are substituted at runtime:

```
{app="{app}", env="{env}"} |= "error"
```

## Triggering a digest manually

From the UI: Reports page → "Run digest now" button.

Via API (requires session cookie or adapt for a Bearer token):

```bash
POST /api/reports/trigger
```

## Roles

| Role | Access |
|---|---|
| `ADMIN` | Full access including admin panel |
| `AM` | Read-only access to reports |

## Tech stack

- **Next.js 16** (App Router)
- **NextAuth v5** (credential provider, Prisma adapter)
- **Prisma 7** (PostgreSQL)
- **shadcn/ui** + Radix UI + Tailwind CSS
- **@react-pdf/renderer** — PDF generation
- **nodemailer** — email dispatch
- **node-cron** — in-process scheduler
- **Anthropic Claude Haiku** — AI hints (optional)
