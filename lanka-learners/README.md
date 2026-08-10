# Lanka Learners

Internal management system for a driving school. Two authenticated roles:

- **OWNER** — full access: management, corrections, analytics, staff administration.
- **EMPLOYEE** — operational data entry: register clients and add records, but never modify existing ones.

Not a public website. There is no sign-up — the owner creates every staff account.

---

## Architecture

```
Browser
  ↓
Next.js 16 App Router  (Server Components · Server Actions · Route Handlers)
  ↓
Passport.js Local Strategy  →  JWT (jose)  →  HttpOnly Secure Cookie
  ↓
Prisma 7  +  @prisma/adapter-pg
  ↓
PostgreSQL  (Neon in production)
```

No Express server, no server-side sessions, no local file storage — so it deploys to Vercel unchanged.

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (`base-nova` / Base UI) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Passport.js Local Strategy → JWT (`jose`, HS256) → HttpOnly cookie |
| Hashing | bcryptjs, cost 12 |
| Validation | Zod v4 (same schemas on client and server) |
| Forms | React Hook Form + `@hookform/resolvers` |
| Charts | Recharts |
| Files | Vercel Blob, with Cloudinary as a fallback |

---

## Requirements

- **Node.js 20.19+** (developed on 26.x)
- **PostgreSQL 14+** — Neon recommended for production
- **npm** (a `package-lock.json` is committed)

---

## Installation

```bash
npm install
```

`postinstall` runs `prisma generate`, so the typed client is always present.

---

## Environment setup

Copy the example file and fill it in:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. For Neon, append `?sslmode=require`. |
| `JWT_SECRET` | Signing key for session tokens. **Minimum 32 characters** — the app refuses to start otherwise. |
| `INITIAL_OWNER_USERNAME` | Username for the first owner account. |
| `INITIAL_OWNER_PASSWORD` | Password for the first owner. Hashed by the seed; never stored in plain text. |
| `INITIAL_OWNER_NAME` | Display name of the first owner. |
| `INITIAL_OWNER_EMAIL` | Optional email for the first owner. |
| `NEXT_PUBLIC_APP_NAME` | Application name shown in the UI. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token — used for profile photos when present. |
| `CLOUDINARY_*` | Cloudinary credentials, used only when no Blob token is set. |

Generate a strong secret:

```bash
openssl rand -base64 48
```

`.env` is git-ignored. Never commit it.

> Profile photo upload needs **one** storage option configured. Everything else works without it; the upload button reports a clear message if storage is missing.

---

## Database

Generate the client and apply the schema:

```bash
npx prisma generate
```

```bash
npx prisma migrate dev
```

Use `migrate deploy` against an existing production database — it applies committed migrations without prompting:

```bash
npx prisma migrate deploy
```

Shortcuts are wired up as npm scripts:

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev
npm run db:deploy     # prisma migrate deploy
npm run db:seed       # create initial owner + default vehicle classes
npm run db:studio     # browse the data
npm run db:reset      # drop, re-migrate and re-seed (destroys all data)
```

### No local PostgreSQL?

Prisma ships a disposable local server:

```bash
npx prisma dev -n lanka
```

It prints a connection string — put it in `DATABASE_URL`, then run `db:deploy` and `db:seed`.

---

## Seed

The seed creates the first OWNER account, the default vehicle classes (A, B1, B, B AUTO, G, AB) and baseline system settings.

```bash
npm run db:seed
```

It reads `INITIAL_OWNER_*` from `.env`, hashes the password with bcrypt before storing it, and is safe to re-run: existing records are left alone and **an existing owner's password is never overwritten**.

Sign in with those credentials, then change the password from **Employee Details → Reset Password**.

---

## Development

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

### Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npx prisma validate
```

```bash
npm run build
```

---

## Production

```bash
npm run build
```

```bash
npm run start
```

`build` runs `prisma generate` first, so a clean CI checkout produces a valid client.

---

## Vercel deployment

1. **Push to GitHub.**

   ```bash
   git push origin main
   ```

2. **Import the repository into Vercel.** Framework preset: Next.js. If this app is not at the repository root, set **Root Directory** to the folder containing this README (`lanka-learners`).

3. **Create the Neon database.** Add the Neon integration from the Vercel Marketplace, or create a project at neon.tech and copy its **pooled** connection string — the host containing `-pooler`.

   Use the pooled string, not the direct one. Serverless Postgres closes idle connections, and a reused warm function instance holding a direct connection will occasionally fail a query with `P1017: Server has closed the connection`. The pooler absorbs that.

4. **Configure environment variables** in *Project → Settings → Environment Variables* for Production (and Preview if you use it):

   ```
   DATABASE_URL        postgresql://…?sslmode=require
   JWT_SECRET          <openssl rand -base64 48>
   INITIAL_OWNER_USERNAME
   INITIAL_OWNER_PASSWORD
   INITIAL_OWNER_NAME
   INITIAL_OWNER_EMAIL
   NEXT_PUBLIC_APP_NAME
   BLOB_READ_WRITE_TOKEN     # or the CLOUDINARY_* trio
   ```

   Adding Vercel Blob from the Storage tab sets `BLOB_READ_WRITE_TOKEN` automatically.

5. **Run the migration and seed against production.** From your machine, with `DATABASE_URL` pointing at Neon:

   ```bash
   npx prisma migrate deploy
   ```

   ```bash
   npm run db:seed
   ```

   To make migrations part of every deploy instead, set the Vercel build command to
   `prisma migrate deploy && next build`.

6. **Deploy**, then sign in as the owner and change the seeded password immediately.

---

## Security model

Authorization is enforced **on the server, in three layers**. Hiding a nav link or a button is UX, never the control.

1. **`src/proxy.ts`** (Next.js 16's renamed middleware) — rejects unauthenticated requests and keeps employees out of owner-only routes. It cannot check whether an account is still active, because it does not touch the database, so it is only the outer layer.
2. **Page guards** — `requireUser()` / `requireOwnerPage()` in every Server Component. These revalidate against the database, catching accounts deactivated since their token was issued.
3. **Action guards** — `requireUserAction()` / `requireOwnerAction()` at the top of **every** Server Action and Route Handler. This is the real boundary: an employee who hand-crafts an HTTP request to an owner-only action receives a permission error, not a mutation.

Other measures:

- Passwords hashed with bcrypt (cost 12). Only hashes are stored, and `passwordHash` is never selected into anything sent to the browser.
- JWTs carry the minimum claims only — user id, role, and a token version. No names, no emails.
- Session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, 8-hour expiry. No token is ever placed in `localStorage`.
- `tokenVersion` is incremented on password reset and deactivation, immediately invalidating any session already issued to that user.
- Login is rate-limited per IP + username, and a failed login on an unknown username still runs a bcrypt comparison, so the endpoint cannot be used to enumerate accounts.
- Inactive accounts cannot sign in, and are rejected with a distinct message only *after* the password is verified.
- All input is validated with Zod on the server regardless of what the client sent. Prisma parameterises every query.
- Audit logs are append-only: there is no update or delete path anywhere in the application, and they are readable by owners only.
- Password material is stripped from audit payloads by a redaction list, so a reset is recorded without recording the password.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are set on every response.
- Raw database errors are never surfaced; users see friendly messages while details go to the server log.

---

## Data model notes

Two values are deliberately **derived, never stored**, so they cannot drift out of sync:

- **Age** — calculated from `dateOfBirth`.
- **Remaining balance** — calculated as `totalAgreedFee − SUM(payments)`.

Relationships are normalised rather than flattened into strings:

- A client's vehicle classes live in `client_vehicle_classes`, one row per class.
- **A single practical training day can cover several vehicle classes** via `practical_training_classes` — separate rows, never `"B, B AUTO"`.
- Written exams and trials are one-to-many, so retakes are just additional rows.
- Money uses `Decimal(12,2)`, not float.
- Calendar-only dates are stored at UTC midnight, which makes date-range filters and the "one lecture attendance per client per day" constraint behave identically in any timezone.

Indexes cover every documented search path: NIC, admission number, dates, statuses, categories, bill numbers, and audit user/action/date.

---

## Project structure

```
prisma/
├── schema.prisma            # models, enums, indexes, constraints
├── migrations/              # committed SQL migrations
└── seed.ts                  # initial owner + default vehicle classes

src/
├── actions/                 # Server Actions — every one starts with an auth guard
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/         # authenticated app shell
│   │   ├── dashboard/  clients/  exams/  trials/  lectures/
│   │   ├── practical-training/  payments/  expenses/  profile/
│   │   └── analytics/  employees/  activity-logs/  settings/   ← owner only
│   ├── (print)/             # bare layout for printable receipts
│   └── api/auth/            # login + logout route handlers
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── layout/  forms/  shared/
│   └── clients/  exams/  trials/  lectures/  practical-training/
│       payments/  expenses/  employees/  analytics/  settings/  activity/
├── lib/
│   ├── auth/                # passport strategy, jwt, session, password, rate limit
│   ├── queries/             # read models for pages
│   ├── validations/         # Zod schemas shared by client and server
│   ├── db.ts  audit.ts  permissions.ts  storage.ts  settings.ts
│   └── format.ts  dates.ts  action-result.ts  search-params.ts
├── generated/prisma/        # generated client (git-ignored)
└── proxy.ts                 # route protection + security headers
```

---

## Roadmap and build notes

See [ROADMAP.md](ROADMAP.md) for the phased build plan and the locked technical decisions.
