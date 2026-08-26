# Fitz
A Whop app for fitness coaches to manage their clients — check-ins, workout plans, macros, and progress, all inside the coach's existing Whop community. One install = one coach; clients access it automatically when they subscribe to the coach's Whop product.

## Stack
- **Framework:** Next.js (App Router, TypeScript, Turbopack)
- **Whop integration:** `@whop/sdk`, `@whop/react` (Frosted UI)
- **Database:** Supabase Postgres (RLS enforced on every tenant-scoped table)
- **Storage:** Supabase Storage (check-in/progress photos)
- **Realtime:** Supabase Realtime (coach dashboard activity feed)
- **Hosting:** Vercel

## Before you touch any code
Read these files in this order — this is not optional, the isolation and payment-correctness rules in here are load-bearing for the whole app:
1. `PRD.md` — what Fitz does and its scope boundaries
2. `TRD.md` — how it's built, the tenant isolation model
3. `WHOP_REFERENCE.md` — which Whop docs matter for this build and why
4. `SECURITY.md` — vulnerabilities to guard against, mapped to this stack
5. `SCALABILITY.md` — what actually matters for 10,000+ users
6. `UI.md` — Frosted UI setup, the two views, mobile/desktop layout
7. `IMPLEMENTATION_PLAN.md` — the phased build order with exit checks
8. `DECISIONS.md` — why key choices were made, so you don't relitigate them

## Local development
```bash
npm install
```
Env vars needed (server-side only, never in `NEXT_PUBLIC_*`):
```
WHOP_API_KEY=
WHOP_APP_ID=
WHOP_CLIENT_ID=
WHOP_CLIENT_SECRET=
WHOP_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
Run against Whop's sandbox environment (`WHOP_BASE_URL=https://sandbox-api.whop.com`) before ever pointing at production. See TRD.md Section 13 for sandbox test card details.

```bash
npm run dev
```
Use the Whop development proxy (see `WHOP_REFERENCE.md` Section 1, or `https://docs.whop.com/developer/guides/dev-proxy.md`) to replicate real iframe/auth behavior locally — the app will not authenticate correctly loaded as a bare localhost URL outside Whop's iframe context.

## The one rule that matters most
Every database query touching `clients`, `checkins`, or `plans` must be scoped by `company_id`, derived from the verified Whop token on that request — never from client input. This is enforced at both the app layer and the database layer (Postgres RLS). See TRD.md Section 4 for the full model. Do not add a new table or feature that skips this pattern.

## Project status
Pre-implementation — this repo currently contains planning docs only. See `IMPLEMENTATION_PLAN.md` for the phase currently in progress.
