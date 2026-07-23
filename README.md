# Putnam Journal

A private Putnam problem journal that combines spaced repetition, attempt history, image storage, email reminders, and technique-level learning analytics.

## What is included

- **Cloudflare Pages dashboard** built with dependency-free HTML, CSS, and JavaScript.
- **Pages Functions API** for authentication, problems, attempts, images, and analytics.
- **Cloudflare D1** for problems, techniques, attempts, schedules, and notification history.
- **Cloudflare R2** for problem and solution images.
- **Cloudflare Worker + Cron Trigger** for daily review reminder emails.
- **Single-user password protection** using an HMAC-signed, HTTP-only session cookie.

### Review schedule

| Attempt result | Next review |
|---|---:|
| Solved | 21 days |
| Almost solved | 7 days |
| Not very close | 1 day |
| Imported but not attempted | Immediately |

Every attempt is stored separately. A new attempt updates the problem's next review date but never overwrites earlier reasoning.

## Repository structure

```text
src/                         Static Pages dashboard
functions/api/[[path]].js    Pages Functions API router
functions/_handlers/         Read, write, image, and analytics handlers
functions/_lib/              Authentication, database, and HTTP helpers
shared/                       Shared review scheduling rules and tests
migrations/                   D1 schema and technique vocabulary
workers/reminder/             Scheduled email reminder Worker
scripts/                      Dependency-free build and validation scripts
```

## 1. Create Cloudflare resources

From the repository root, authenticate Wrangler and create the database and image bucket:

```bash
npx wrangler login
npx wrangler d1 create putnam-journal
npx wrangler r2 bucket create putnam-journal-images
```

Copy the D1 database ID returned by Cloudflare into both:

- `wrangler.jsonc`
- `workers/reminder/wrangler.jsonc`

Replace the placeholder ID:

```text
00000000-0000-0000-0000-000000000000
```

Apply the database migrations:

```bash
npm run db:migrate:remote
```

This creates the journal tables and seeds 49 common Putnam techniques.

## 2. Configure the Pages project

Connect this GitHub repository to **Cloudflare Pages**.

Use these build settings:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

In **Workers & Pages → your Pages project → Settings → Bindings**, add:

| Type | Variable name | Resource |
|---|---|---|
| D1 database | `DB` | `putnam-journal` |
| R2 bucket | `IMAGES` | `putnam-journal-images` |

Add these encrypted environment variables for both Production and Preview:

| Variable | Purpose |
|---|---|
| `APP_PASSWORD` | Password used to enter the journal |
| `SESSION_SECRET` | At least 32 random characters used to sign sessions |

Optional variable:

| Variable | Default |
|---|---|
| `SESSION_DAYS` | `30` |

Generate a session secret locally with:

```bash
openssl rand -base64 48
```

Redeploy the Pages project after adding bindings or secrets.

## 3. Configure email sending

The reminder Worker uses Cloudflare Email Service's native `send_email` binding.

1. In Cloudflare, open **Compute → Email Service → Email Sending**.
2. Onboard a domain that is using Cloudflare DNS.
3. Choose a sender such as `putnam@yourdomain.com`.
4. Update `workers/reminder/wrangler.jsonc`:
   - `REMINDER_EMAIL`: the inbox that should receive reminders
   - `EMAIL_FROM`: the onboarded sender address
   - `APP_URL`: the deployed Pages URL
   - `TIMEZONE`: defaults to `America/New_York`
   - `REMINDER_HOUR`: defaults to `8`
5. Replace the D1 database ID with the same ID used by Pages.

Deploy the Worker:

```bash
npm run deploy:reminder
```

The Cron Trigger runs hourly. The Worker sends only during the configured local hour, so daylight-saving changes are handled by the timezone rather than by a fixed UTC schedule.

The notification log prevents a second email for the same problem and review cycle. A later attempt creates a new review date and therefore a new eligible reminder.

## 4. Local development

Create a local secrets file:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`, then initialize the local D1 database:

```bash
npm run db:migrate:local
```

Start the Pages dashboard and Functions runtime:

```bash
npm run dev:pages
```

The static build itself has no runtime dependencies:

```bash
npm run build
```

Validate syntax, scheduling tests, and the static build:

```bash
npm run check
```

Test the reminder Worker locally after configuring remote email bindings:

```bash
npm run dev:reminder
```

Then invoke its scheduled handler using the URL Wrangler prints for scheduled testing.

## Learning analytics

The current pattern engine computes:

- Success rates by A0–A6 and B0–B6
- Success rates by mathematical area
- Technique recognition rate
- Technique execution rate after correct recognition
- Wrong-technique application rate
- Repeated substitutions such as “tried induction instead of an invariant”
- Rule-based insights that distinguish recognition problems from execution problems

This first release deliberately uses transparent statistics rather than an opaque model. The attempt-level schema is designed so a later machine-learning layer can add mastery estimates, problem recommendations, clustering, and adaptive intervals without changing the journal history.

## Security notes

- The app is intended as a private, single-user journal.
- Problem and solution images are served through authenticated API routes; the R2 bucket does not need to be public.
- Authentication cookies are HTTP-only, Secure, and SameSite Strict.
- Uploaded files are limited to JPEG, PNG, WebP, or GIF and 10 MB per image.
- For an additional perimeter, Cloudflare Access can be placed in front of the Pages project.
