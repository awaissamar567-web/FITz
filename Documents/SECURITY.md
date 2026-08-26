# SECURITY.md — Fitz
_Give this file directly to any LLM/agent writing code for this app. Every item below is relevant to this specific stack (Next.js + Supabase + Whop). Do not skip items because they "seem unlikely" — most breaches happen exactly there._

## Priority tier: CRITICAL — these break your core promise (tenant isolation) if missed

### 1. Multi-Tenant Data Isolation Failure
This is your #1 stated risk. Never trust a `company_id`, `client_id`, or `experienceId` supplied by the client (body, query string, or even a path param) as authorization — it is a routing hint only. Authorization always comes from the verified Whop token on that exact request (see TRD Section 3).
```
Prompt: Audit all multi-tenant queries, routes, storage paths, and background jobs.
Never trust a tenant/org ID because the client supplied it. Derive membership from
the authenticated identity (verifyUserToken + checkAccess) and enforce tenant
constraints server-side AND in database RLS policies. Add automated cross-tenant
isolation tests using two real accounts.
```

### 2. Database Row-Level Security Misconfiguration
RLS must be **enabled and tested**, not just written. A policy that exists but isn't enabled, or is enabled with a bug, gives zero protection while looking secure in a code review.
```
Prompt: Audit RLS for every client-accessible table (clients, checkins, plans,
companies). Confirm RLS is actually ENABLED (not just policy definitions present).
Create explicit SELECT/INSERT/UPDATE/DELETE policies keyed on company_id.
Test with two unrelated coach accounts, an unauthenticated request, and the
service-role key path. Run EXPLAIN ANALYZE with RLS on vs off to confirm the
policy actually filters, not just that the query returns.
```

### 3. Broken Object Level Authorization (IDOR)
Any endpoint that takes a `client_id` (e.g. "get check-in history," "assign plan") must verify that client belongs to *this* coach's `company_id` — not just that the coach is logged in.
```
Prompt: Review every endpoint/server action taking a client_id, checkin_id, or
plan_id. Add server-side ownership checks: the record's company_id must match
the requesting coach's verified company_id before any read/write. Test that
coach A cannot fetch/edit coach B's client by guessing/enumerating an ID.
```

### 4. Cloud/Service Role Key Exposure
Supabase's service-role key bypasses RLS entirely — if it leaks to the browser, isolation is gone regardless of how good your policies are.
```
Prompt: Search the entire frontend bundle, environment config, and repo for
SUPABASE_SERVICE_ROLE_KEY or any admin-level credential. It must exist only in
server-side code (API routes, server actions), never in NEXT_PUBLIC_* variables
or client components. Client code uses only the anon key, protected by RLS.
```

### 5. Webhook Signature Verification Missing / Replay
Whop webhooks (`membership.activated`, `membership.deactivated`) control who gets access to the app. A forged or replayed webhook could fake a subscription.
```
Prompt: Verify every incoming Whop webhook using the SDK's signature verification
against the raw request body before parsing. Reject invalid signatures outright.
Store the Whop event ID with a unique constraint and process idempotently — a
resent valid event must not create duplicate clients or double-process a
cancellation. Fail closed on any verification error.
```

## Priority tier: HIGH — directly relevant to this app's data and payment flows

### 6. Payment/Entitlement Logic Failure (coach subscription paywall)
Never unlock the Pro tier from the client-side `inAppPurchase()` result — that's UX feedback only.
```
Prompt: Confirm that plan upgrades (company.plan = 'pro') are set only from the
verified membership.activated webhook, never from a client-reported purchase
result. Make the webhook handler idempotent. Add a test simulating a dropped
connection mid-purchase — the UI must not claim upgraded access the DB doesn't
have.
```

### 7. Mass Assignment / Parameter Tampering
A coach's "update client" request should never be able to set fields like `company_id` or another coach's data via a spread/bulk update.
```
Prompt: Review all create/update operations on clients, checkins, and plans.
Never bind an entire request body directly to a database update. Explicitly
allowlist writable fields per operation. company_id, status transitions tied to
webhooks, and ownership fields are never client-writable.
```

### 8. Insecure File Upload / Public Storage (progress photos)
Progress photos are private, per-client, per-coach data.
```
Prompt: Confirm the Supabase Storage bucket for check-in photos is private by
default, not public-read. Enforce storage RLS mirroring the company_id boundary.
Validate uploaded file type by content, not just extension. Generate server-side
filenames — never trust a client-supplied path. Use short-lived signed URLs to
serve photos, scoped to the requesting coach's own clients only.
```

### 9. Missing Rate Limiting on Sensitive Endpoints
Check-in submission and any public-facing route are abuse targets.
```
Prompt: Add server-side rate limits to check-in submission, intake form
submission, and any API route reachable by an authenticated client. Use
account + IP signals. Return 429 safely without leaking whether an account
exists.
```

### 10. Verbose Errors / Debug Mode in Production
```
Prompt: Ensure production error responses are generic with a correlation ID —
no stack traces, SQL errors, or Supabase internals returned to the client.
Confirm no debug/test routes or seed endpoints are reachable in production.
```

### 11. Security Headers / HTTPS / Cookie Attributes
```
Prompt: Set Strict-Transport-Security, a restrictive Content-Security-Policy
(frame-ancestors limited to Whop's domain since this runs in their iframe —
do NOT set frame-ancestors 'none' or this breaks embedding), X-Content-Type-
Options: nosniff, and Referrer-Policy. Confirm all traffic is HTTPS via Vercel.
```

## Priority tier: MEDIUM — standard hygiene, still worth a pass before launch

- **Dependency scanning**: run `npm audit` / a maintained scanner before launch and periodically after; keep lockfiles committed.
- **Sensitive data in logs**: never log the Whop token, Supabase keys, or full client health/stats payloads in plaintext logs.
- **Exposed config files**: confirm `.env`, `.git`, and any backup files are not in the Vercel deployment's public output.
- **Insecure randomness**: any generated ID (invite codes, if added later) must use a cryptographically secure generator, not `Math.random()`.

## Explicitly out of scope for this app (don't waste time auditing)
- Custom login/password storage — Whop handles all auth, you never touch a password
- OAuth redirect/PKCE flows — not applicable, Whop's iframe token model replaces this entirely
- GraphQL — not used
- CSRF tokens — low relevance since there's no traditional cookie-session login flow, but confirm the API routes still validate the Whop token per-request regardless of origin

## Launch checklist (do not skip)
1. Two real coach sandbox accounts, each with their own clients — confirm zero cross-visibility via UI **and** direct API calls
2. `EXPLAIN ANALYZE` every RLS policy with real data volume, not a 5-row dev table
3. Confirm service-role key never appears in any client-shipped JS bundle (grep the built output, not just source)
4. Simulate a duplicate/replayed webhook and confirm no duplicate client or double state change
5. Simulate a dropped payment mid-purchase and confirm the UI doesn't falsely show "Pro" until the webhook lands
