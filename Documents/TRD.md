# TRD: Fitz (Whop App)
_Written to be handed directly to an LLM/coding agent as build guidance. Follow this exactly — the isolation model is non-negotiable._

## 1. Stack
- **Framework**: Next.js (App Router, TypeScript, Turbopack)
- **Whop integration**: `@whop/sdk` — auth, access checks, webhooks
- **Database**: Supabase Postgres
- **Storage**: Supabase Storage (check-in/progress photos)
- **Realtime**: Supabase Realtime (activity feed, live client status)
- **Hosting/Domain**: Vercel

## 2. The Two Views (per Whop's App Views spec)
This app uses **both** Whop views:

| View | Route | Who | Gate |
|---|---|---|---|
| **Experience view** (member/client) | `/experiences/[experienceId]` | Client | `checkAccess` → `has_access === true` for that `experienceId` |
| **Dashboard view** (owner/coach) | `/dashboard/[companyId]` | Coach | `checkAccess` → `access_level === "admin"` for that `companyId` |

`experienceId` (`exp_xxx`) and `companyId` (`biz_xxx`) are Whop-issued, globally unique identifiers — the app never generates or guesses these. This is the top-level tenant boundary and it's enforced by Whop itself, not by our code.

## 3. Authentication — exact pattern, every request
Whop attaches a verified JWT in the `x-whop-user-token` header on every same-origin request inside the iframe. **Never build custom login. Never trust a client-supplied companyId/experienceId/clientId without re-verifying server-side.**

```ts
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";

// Client (experience) route
const { userId } = await whopsdk.verifyUserToken(await headers());
const access = await whopsdk.users.checkAccess({
  id: userId,
  resource_id: experienceId, // exp_xxx from the URL path param
});
if (!access.has_access) return new Response("Access denied", { status: 403 });

// Coach (dashboard) route
const access = await whopsdk.users.checkAccess({
  id: userId,
  resource_id: companyId, // biz_xxx from the URL path param
});
if (access.access_level !== "admin") return new Response("Admin access required", { status: 403 });
```

`access_level` returned is one of `customer` | `admin` | `no_access`. This check must run **server-side, on every protected request** (page load and API route) — not just once at login. There is no persistent "session" to trust; the token is re-verified every time.

## 4. Data Isolation Model — why cross-contamination is structurally prevented
Three independent layers, each of which would have to fail for one coach to ever see another's data:

**Layer 1 — Whop's own access control.** A coach's JWT can only ever pass `checkAccess` for the `companyId`/`experienceId` they actually belong to. This isn't our code — it's Whop's server verifying the token. A coach cannot forge access to another coach's `companyId`.

**Layer 2 — Application query scoping.** Every database call includes an explicit filter:
```ts
.eq('company_id', session.companyId)
```
`session.companyId` is derived from the verified token on *this* request — never from a request body, query string, or cached client-side value.

**Layer 3 — Postgres Row-Level Security (RLS).** This is the layer that matters most for your "I don't want to worry about this again" goal. RLS means the **database itself** rejects any query that doesn't match the tenant boundary — even if a future code change forgets the `.eq('company_id', ...)` filter, the database still won't return another coach's rows. This turns "a developer might forget to scope a query" from a data breach into a silent empty result.

```sql
alter table clients enable row level security;

create policy "coach reads own clients"
on clients for select
using (company_id = current_setting('app.current_company_id')::uuid);

-- Same pattern repeated on checkins, plans, and every other tenant-scoped table.
```
`app.current_company_id` is set per-request from the verified token, server-side, before any query runs — never from client input.

**Practical answer to "what's the probability of a leak":** with all three layers in place, a leak would require Whop's own auth system to be bypassed *and* your app-layer filter to be missing *and* RLS to be missing/misconfigured, all at once. That's the standard defense-in-depth pattern used for multi-tenant SaaS at any scale — it's not unique to this app, and it's why the recommendation is Postgres RLS specifically rather than "just remember to filter in code."

## 5. Schema (Supabase/Postgres)
```sql
companies (
  id uuid pk,
  whop_company_id text unique not null,   -- biz_xxx
  coach_name text,
  default_checkin_frequency text,          -- 'daily' | 'weekly'
  units text default 'kg',
  created_at timestamptz default now()
)

clients (
  id uuid pk,
  company_id uuid references companies(id),
  whop_user_id text not null,
  whop_experience_id text not null,        -- exp_xxx this client belongs to
  status text default 'active',            -- active | at_risk | cancelled
  goal text,
  stats jsonb,
  experience_level text,
  equipment jsonb,
  limitations text,
  joined_at timestamptz default now(),
  unique(company_id, whop_user_id)
)

checkins (
  id uuid pk,
  company_id uuid references companies(id),
  client_id uuid references clients(id),
  date date not null,
  weight numeric,
  photo_url text,
  macro_hit jsonb,
  notes text,
  created_at timestamptz default now()
)

plans (
  id uuid pk,
  company_id uuid references companies(id),
  client_id uuid references clients(id),
  split_name text,
  exercises jsonb,      -- [{name, sets, reps}]
  macros jsonb,          -- {calories, protein, carbs, fat}
  updated_at timestamptz default now()
)
```
Every child table carries its own `company_id` column (denormalized, not just inherited via `client_id` join) — this lets every RLS policy and every index filter directly, without needing a join to enforce isolation. This is deliberate redundancy for security and speed, not an oversight.

Indexes: composite `(company_id, client_id)` on `checkins` and `plans`. Composite `(company_id, status)` on `clients`.

## 6. Webhooks (Whop → App)
Verified via Whop's Standard Webhooks signature check — reject unsigned/invalid payloads before any processing, every time.
- `membership.activated` → create/reactivate client row under the correct `company_id` (from the webhook payload's business/company reference, not guessed)
- `membership.deactivated` → set `status = 'cancelled'` (covers failed payment, cancellation, or leaving)

## 7. Retention/Churn Computation
- Webhook-driven: `membership.deactivated` → `cancelled`
- Scheduled job (Supabase Edge Function, daily): flag `at_risk` if time since last check-in exceeds `company.default_checkin_frequency` threshold
Dashboard reads the precomputed `status` column — no runtime recalculation on page load.

## 8. Realtime Activity Feed
Supabase Realtime subscription on `checkins`, filtered server-side by `company_id` before the subscription is even opened for that session — a coach's browser never subscribes to a channel that could contain another coach's rows.

## 9. Storage Rules
Bucket path convention: `company_id/client_id/filename`. Storage RLS policies mirror the Postgres RLS — same `company_id` boundary, same enforcement logic, applied consistently everywhere data lives.

## 10. Scalability Notes
- RLS + composite indexes mean isolation and query performance don't degrade as tenant count grows — each coach's queries only ever touch their own rows, regardless of total platform size
- This schema/isolation shape is the standard multi-tenant SaaS pattern — it doesn't need a redesign to support thousands of coaches and their clients; it needs the same policies applied to any new table you add later
- Rule for all future development: **any new table that holds coach- or client-specific data gets a `company_id` column and an RLS policy before it gets used — no exceptions, no "add it later."**

## 11. Environment/Secrets
`WHOP_API_KEY`, `WHOP_APP_ID`, `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `WHOP_WEBHOOK_SECRET` — server-side only, never in client bundles. Supabase service role key server-side only; client-facing code uses the anon key, with RLS as the actual enforcement — the anon key alone should never be trusted to be "safe" without RLS behind it.

## 12. Instructions for any LLM/agent implementing this
1. Never write a Supabase query against `clients`, `checkins`, or `plans` without a `company_id` filter, even where RLS is also present — defense in depth, not either/or.
2. Never accept `company_id`, `experienceId`, or `client_id` from a request body or query string as the source of truth for access control — always derive the tenant from the verified Whop token on that request.
3. Before marking any feature "done," confirm an RLS policy exists on every table it touches. If a table has no RLS policy, it is not production-ready regardless of whether the app-layer filter looks correct.
4. When adding a new feature/table, copy the isolation pattern from Section 4 exactly — do not improvise a new access-control approach.

## 13. Paywall & Coach Subscription (In-App Purchase)
Coach's subscription to *this app* is a separate purchase from a client's subscription to the coach — same Whop mechanism, one level up the chain.

**Flow:**
1. Product/plan set up in your Whop developer dashboard → gives you a `plan_id`
2. Server creates a checkout configuration when the coach needs to upgrade:
```ts
const checkoutConfiguration = await whopsdk.checkoutConfigurations.create({
  plan_id: "plan_XXXXX",
  metadata: { coach_company_id: companyId },
});
```
3. Client opens Whop's native payment modal inside your iframe — coach never leaves the app:
```tsx
"use client";
import { useIframeSdk } from "@whop/react";

const iframeSdk = useIframeSdk();
const res = await iframeSdk.inAppPurchase({
  planId: checkoutConfiguration.plan.id,
  id: checkoutConfiguration.id,
});
```
4. **Source of truth is the `membership.activated` webhook, never the client-side `res.status`.** The modal result is UX feedback only — flip `companies.plan = 'pro'` only when the signed webhook arrives. A dropped connection mid-purchase must not leave the UI claiming upgraded access the database doesn't have.

**Free tier cap enforcement (server-side, not client-side):**
```ts
// Runs before inserting a new clients row — never trust a client-side count
const { count } = await supabase
  .from('clients')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', companyId)
  .eq('status', 'active');

if (count >= 5 && company.plan !== 'pro') {
  return { error: 'limit_reached' }; // frontend renders the upgrade button/modal
}
```
Suggested free tier: 5 active clients. Paid tier: unlimited clients + retention dashboard insights + templates (v2). Trigger the upgrade prompt at the exact moment they try to add client #6 — tied to their own growth, not a generic banner.

**Sandbox testing:** create sandbox plans at `sandbox.whop.com/dashboard`, use test card `4242 4242 4242 4242` with any future expiry/CVC, and set `WHOP_BASE_URL=https://sandbox-api.whop.com` in dev/preview environments before switching to production for the real deploy.

## 14. Additional Guidance Before Build

**Webhook idempotency** — Whop (like any webhook provider) can redeliver the same event. Every webhook handler must be safe to run twice: use `upsert` keyed on the Whop event ID or `(company_id, whop_user_id)`, never a bare `insert` that would create duplicate clients or double-charge state changes.

**Rate limiting** — protect check-in submission and any public-facing API routes from abuse (a client accidentally or intentionally spamming submissions). Simple per-user rate limit at the API route level; Supabase Edge Functions or a lightweight middleware both work.

**Error handling on `checkAccess` and `verifyUserToken`** — these calls can throw (expired token, network issue). Never let a thrown error accidentally fall through to "access granted" — fail closed (deny access) on any exception, not open.

**Data retention / cancelled clients** — decide now, not later: when a client's membership goes `cancelled`, do you keep their check-in/plan history (for the coach's records) or purge it? Recommend: soft-delete (`status = 'cancelled'`, data retained) rather than hard delete, since a coach may resubscribe a returning client and losing their history would be a bad experience. Revisit only if storage cost becomes real.

**Backups** — Supabase provides automatic daily backups on paid plans; confirm this is enabled before launch, not after an incident.

**Monitoring** — minimum viable: error logging on all webhook handlers and API routes (e.g. Sentry or even simple structured logs), since a silent webhook failure means a coach's client never gets created and nobody notices until they complain.

**Testing the isolation model specifically** — before launch, create two separate sandbox coach accounts with their own clients and manually confirm coach A's dashboard/API cannot return coach B's data under any request. This is the one test that matters most given your top concern — don't skip it even though it feels like "extra" QA.
