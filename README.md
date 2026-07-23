# Putnam Journal

A private, full-stack Putnam problem journal running as one Cloudflare Worker. The same deployment serves the dashboard, handles the API, stores attempt history, schedules reviews, and runs hourly email-reminder checks.

## Review schedule

| Attempt result | Next review |
|---|---:|
| Solved | 21 days |
| Almost solved | 7 days |
| Not very close | 1 day |
| Imported but not attempted | Immediately |

Every attempt is stored separately. A new attempt updates the next review date without overwriting earlier reasoning.

## Architecture

```text
Cloudflare Worker
├── Static dashboard from src/
├── /api/* runtime routes
├── D1 database binding: DB
├── R2 image binding: IMAGES
├── Email Service binding: EMAIL
└── Hourly Cron Trigger
```

The Worker entry point is `worker/index.js`. Static files are served through the `ASSETS` binding, while `/api` and `/api/*` run through the Worker first.

## Deploy from Cloudflare Workers Builds

Connect the GitHub repository `justing0406/Putnam` to a Worker and use:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `/` |
| Build command | Leave blank |
| Deploy command | `npx wrangler deploy` |

The repository's `wrangler.jsonc` already declares the Worker entry point, static assets, hourly cron, and non-secret defaults. A successful deployment changes the project from static-assets-only to a full Worker, which unlocks runtime variables, bindings, triggers, and observability in the dashboard.

## Required runtime configuration

After the first successful deployment, open:

**Workers & Pages → Putnam → Settings → Variables and Secrets**

Add these secrets:

| Name | Value |
|---|---|
| `APP_PASSWORD` | Password used to enter the journal |
| `SESSION_SECRET` | Random string of at least 32 characters |

Add these reminder variables when email is ready:

| Name | Example |
|---|---|
| `REMINDER_EMAIL` | `you@example.com` |
| `EMAIL_FROM` | `putnam@your-domain.com` |
| `APP_URL` | Your deployed Worker URL |

The repository already supplies:

- `SESSION_DAYS=30`
- `TIMEZONE=America/New_York`
- `REMINDER_HOUR=8`

## D1 database

Create a D1 database named:

```text
putnam-journal
```

Then add a Worker binding:

| Binding name | Resource |
|---|---|
| `DB` | `putnam-journal` |

Apply the migrations from the repository:

```bash
npx wrangler login
npm run db:migrate:remote
```

This creates the journal tables and seeds 49 Putnam problem-solving techniques.

## R2 image storage

Create an R2 bucket named:

```text
putnam-journal-images
```

Then add a Worker binding:

| Binding name | Resource |
|---|---|
| `IMAGES` | `putnam-journal-images` |

The bucket can remain private. Problem and solution images are returned only through authenticated API routes.

## Email reminders

Onboard a sending domain in Cloudflare Email Service, then add a Send Email binding named:

```text
EMAIL
```

The Worker checks once per hour and sends only during the configured local reminder hour. It skips safely until the database, email binding, and reminder variables are all configured.

## Local development

```bash
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Test the scheduled handler locally at the URL Wrangler provides for scheduled testing.

## Validation

```bash
npm run check
```

This runs JavaScript syntax checks, the spaced-review scheduling tests, and the static dashboard build.

## Learning analytics

The current analytics engine tracks:

- Success rates by A0–A6 and B0–B6
- Success rates by mathematical area
- Technique recognition rate
- Technique execution after correct recognition
- Wrong-technique application rate
- Repeated substitutions such as trying induction when an invariant was needed
- Rule-based insights distinguishing recognition gaps from execution gaps

The attempt-level schema is designed to support later mastery estimates, adaptive intervals, clustering, and problem recommendations.
