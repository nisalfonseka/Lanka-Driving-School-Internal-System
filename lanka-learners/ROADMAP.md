# Lanka Learners — Implementation Roadmap

Internal driving-school management system. Two roles: **OWNER** (management/control) and **EMPLOYEE** (data entry).

## Architecture

```
Browser
  ↓
Next.js 16 App Router (Server Components + Server Actions + Route Handlers)
  ↓
Passport.js Local Strategy  →  JWT (jose)  →  HttpOnly Secure Cookie
  ↓
Prisma 7 + @prisma/adapter-pg
  ↓
PostgreSQL (Neon in production)
```

No Express server. No server-side sessions. Stateless JWT so it runs on Vercel serverless/Fluid Compute.

### Locked technical decisions

| Concern | Decision | Reason |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript | Full-stack in one deployable |
| Styling | Tailwind CSS v4 + shadcn/ui (`base-nova`, Base UI) | Consistent internal-tool design system |
| ORM | Prisma 7 + `@prisma/adapter-pg` + `pg` | Prisma 7 requires a driver adapter for SQL |
| DB | PostgreSQL / Neon | Serverless-friendly, matches Vercel |
| Auth | Passport.js Local Strategy (verify callback only) | Requirement; used as the credential-verification layer |
| Token | `jose` JWT, HS256 | Runtime-agnostic (works in middleware + route handlers) |
| Hashing | `bcryptjs` | Pure JS, no native build on serverless |
| Validation | Zod v4, shared between client (RHF) and server | Never trust the client |
| Forms | React Hook Form + `@hookform/resolvers` | Ergonomic multi-section forms |
| Charts | Recharts | Requirement |
| Files | Vercel Blob (primary) / Cloudinary (fallback) behind one `storage.ts` | No local filesystem on Vercel |
| Toasts | Sonner | shadcn standard |

### Authorization model

Enforcement lives on the **server**, in three layers:

1. `middleware.ts` — rejects unauthenticated requests, blocks `/analytics`, `/employees`, `/activity-logs`, `/settings` for employees.
2. Page-level `requireOwner()` / `requireAuth()` in Server Components.
3. **Action-level guards inside every Server Action / Route Handler** — the real boundary. A hand-crafted POST from an employee is rejected with a `FORBIDDEN` result / HTTP 403.

Hiding sidebar links is UX, never security.

### Employee vs Owner capability matrix

| Capability | OWNER | EMPLOYEE |
|---|---|---|
| Create clients, exams, trials, lectures, training, payments, expenses | ✅ | ✅ |
| **Edit/correct** any existing record | ✅ | ❌ (403) |
| Delete records | ✅ (where allowed) | ❌ |
| Analytics, employees, activity logs, settings | ✅ | ❌ (403) |
| Vehicle class management | ✅ | ❌ |
| Reset employee passwords | ✅ | ❌ |

---

## Phases

### Phase 1 — Project setup ✅
Next.js + TypeScript + Tailwind v4 + shadcn/ui scaffold, dependency install, theme applied, environment configuration (`.env.example`).

### Phase 2 — Database
- `prisma/schema.prisma`: `User`, `Client`, `VehicleClass`, `ClientVehicleClass`, `ClientDocument`, `PreviousLicense`, `PreviousLicenseClass`, `WrittenExam`, `TrialExam`, `LectureAttendance`, `PracticalTraining`, `PracticalTrainingClass`, `ClientPayment`, `CompanyExpense`, `AuditLog`, `SystemSetting`.
- Enums: `Role`, `UserStatus`, `ClientStatus`, `ScheduleType`, `Attendance`, `ExamResult`, `TrialResult`, `PaymentType`, `ExpenseCategory`, `FuelSubCategory`, `AuditAction`.
- Indexes on every documented search column; unique constraints on `idNumber`, `admissionNumber`, `billNumber`, `username`, `email`, `VehicleClass.code`.
- Age is **derived** from `dateOfBirth`; remaining balance is **derived** from payments. Neither is stored.
- `prisma migrate dev` + seed (initial OWNER from env, default vehicle classes A / B1 / B / B AUTO / G / AB).

### Phase 3 — Authentication
Passport Local verify callback → bcrypt compare → inactive check → JWT `{ sub, role, tv }` → HttpOnly / Secure / SameSite=Lax cookie. Login rate limiting, `LOGIN`/`LOGOUT` audit entries, `tokenVersion` bump invalidates existing tokens on password reset or deactivation.

### Phase 4 — Application shell
Role-aware sidebar, top bar, responsive layout (desktop-first, collapses to a sheet on mobile), login page, dashboards backed by real aggregates, error/not-found/loading boundaries.

### Phase 5 — Clients
Multi-section registration form, server-side paginated directory with filters, client profile with tabs, owner-only editing, profile photo upload.

### Phase 6–7 — Operations
Written exams, practical trials (multiple attempts each), lecture attendance, practical training with **multiple vehicle classes per training day** and per-class day totals.

### Phase 8 — Finance
Payments with unique bill numbers and computed balances, printable receipt, company expenses with categories and fuel subcategories.

### Phase 9 — Owner administration
Recharts analytics from real aggregates, employee management (create / edit / activate / deactivate / reset password), audit log viewer with filters and detail dialog, system settings.

### Phase 10 — Security review
Authorization on every mutation, audit coverage, no `passwordHash` or secrets crossing to the client, security headers, no tokens in `localStorage`.

### Phase 11 — UI/UX review
Consistent tables (pagination, search, filter, loading/empty/error states), no horizontal overflow, print stylesheet.

### Phase 12 — Deployment readiness
`tsc --noEmit`, ESLint, `prisma validate`, `next build` all clean. README with Neon + Vercel steps.

---

## Verification gates

Run after each phase; nothing moves forward with a red gate.

```bash
npx prisma validate
npx tsc --noEmit
npm run lint
npm run build
```
