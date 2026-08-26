# IMPLEMENTATION_PLAN.md — Fitz
_Ties PRD.md, TRD.md, SECURITY.md, SCALABILITY.md, and UI.md into a build order. Follow phases in sequence — each phase assumes the previous one is working and tested, not just written._

## Phase -1 — Read everything first (mandatory, not optional)
Before Phase 0, read every one of these files completely, in this order. Do not skim. Do not jump to code because a request "seems simple" — the isolation and payment-correctness rules in these files are exactly the kind of thing that looks skippable and isn't:
1. `README.md` — orientation
2. `PRD.md` — what Fitz does, scope boundaries
3. `TRD.md` — technical architecture, the isolation model
4. `WHOP_REFERENCE.md` — which Whop docs apply to this build, and which don't
5. `SECURITY.md` — every vulnerability class mapped to this stack
6. `SCALABILITY.md` — what matters at 10,000+ users
7. `UI.md` — Frosted UI, the two views, layout rules
8. `DECISIONS.md` — why choices were made, so they aren't relitigated mid-build

**If anything in a later phase seems to contradict something in these files, stop and flag it rather than silently choosing one over the other.** These documents were built together and are meant to be internally consistent — an apparent contradiction usually means something needs clarifying with the person, not a judgment call to make alone.


## Phase 0 — Whop + infra setup (before writing app code)
1. Create the app in Whop developer dashboard, configure both hosting paths: `/experiences/[experienceId]` and `/dashboard/[companyId]`
2. Create sandbox plans for testing (both the coach's product-to-you and a test client-to-coach product)
3. Scaffold Next.js (App Router, TypeScript, Turbopack) using Whop's official template
4. Create Supabase project, note the connection strings (pooled + direct)
5. Set all env vars server-side only: `WHOP_API_KEY`, `WHOP_APP_ID`, `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `WHOP_WEBHOOK_SECRET`, Supabase URL + anon key + service role key
6. Install `@whop/sdk`, `@whop/react`, configure `WhopApp` provider and Tailwind plugin per UI.md Section 1

**Exit check:** local dev proxy runs, you can load both an empty experience view and dashboard view inside a real Whop sandbox iframe with no errors.

## Phase 1 — Auth + isolation skeleton (build this before any feature)
1. Implement `verifyUserToken` + `checkAccess` pattern exactly as in TRD Section 3, on both view routes
2. Create the `companies` table, enable RLS, write the policy
3. Confirm: a coach opening the dashboard gets `access_level === "admin"` gated correctly; a non-member gets denied

**Exit check — do not proceed past this phase until true:** create two separate sandbox coach accounts. Confirm each can load their own dashboard and neither can load the other's `companyId` route even by manually editing the URL. This is SECURITY.md checklist item #1, done early instead of at the end, because everything else is built on top of this holding.

## Phase 2 — Data model + webhooks
1. Create `clients`, `checkins`, `plans` tables with `company_id` on every one (TRD Section 5)
2. Enable and write RLS policies on all three (SECURITY.md #2)
3. Add indexes from SCALABILITY.md Section 2
4. Build the webhook handler: verify signature, handle `membership.activated`/`membership.deactivated`, idempotent via stored event ID (SECURITY.md #5)
5. Test with Whop's `testWebhook` call, and manually resend the same event to confirm no duplicate rows

**Exit check:** subscribing a sandbox client creates exactly one `clients` row; resending the same webhook event does not create a second one; cancelling sets `status = 'cancelled'`.

## Phase 3 — Member view (client side)
Build in this order, per PRD 4.1 and UI.md Section 2:
1. Onboarding/intake form → writes to `clients` row (goal, stats, experience, equipment, limitations)
2. Check-in form → writes to `checkins` (weight, photo, macro adherence, notes)
3. Photo upload → direct-to-Supabase-Storage signed upload, private bucket, path convention `company_id/client_id/filename` (SECURITY.md #8)
4. "Today" screen → reads current plan + macros (read-only at this stage, coach assigns in Phase 4)
5. History screen → paginated check-in list (keyset pagination per SCALABILITY.md Section 1)

**Exit check:** a sandbox client can complete onboarding, submit a check-in with a photo, and see it reflected — all scoped correctly, verified by trying to access another sandbox client's data via direct API call and confirming denial.

## Phase 4 — Owner view (coach side)
Build in this order, per PRD 4.3–4.4 and UI.md Section 2:
1. Client list — reads all `clients` where `company_id` matches, only
2. Client profile — check-in history, current plan
3. Assign/edit plan form → writes `plans` (split, exercises, reps, macros)
4. Dashboard home — client overview stats, activity feed (Realtime subscription scoped per `company_id`, per SECURITY.md/SCALABILITY.md Realtime notes)
5. Quick actions — Whop chat link-out, assign-routine shortcut
6. Today's schedule — read-only reference list

**Exit check:** repeat the two-coach isolation test from Phase 1, now with real client/checkin/plan data — coach A's dashboard, client list, and activity feed must show zero trace of coach B's clients, confirmed via UI and direct API calls.

## Phase 5 — Retention/churn + at-risk flagging
1. Supabase Edge Function, scheduled daily, flags `at_risk` per TRD Section 7
2. Dashboard reads precomputed `status`, no runtime calculation

**Exit check:** manually backdate a test check-in past the threshold, confirm the scheduled job flags it correctly on next run.

## Phase 6 — Paywall (coach subscription to the app)
1. Set up your own product/plan in Whop dashboard
2. Implement `checkoutConfigurations.create` + `iframeSdk.inAppPurchase` per TRD Section 13
3. Server-side cap enforcement (5 active clients free tier) before any new client insert
4. Confirm plan status flips only from the verified webhook, never the client-side purchase result

**Exit check:** simulate a dropped connection mid-purchase (close the tab right after `inAppPurchase` resolves but before any follow-up) — confirm the UI does not falsely show "Pro" until the webhook actually lands and updates the database.

## Phase 7 — Hardening pass (before real coaches touch it)
Run the full SECURITY.md launch checklist and SCALABILITY.md pre-launch checklist together:
1. `EXPLAIN ANALYZE` every RLS policy with seeded realistic data volume (hundreds of clients, thousands of check-ins) — not the 5-row dev dataset
2. Grep the built frontend output for the service-role key or any secret — confirm nothing leaks
3. Rate limiting on check-in submission and intake form
4. Generic error responses in production, no stack traces
5. Security headers set (CSP with `frame-ancestors` allowing Whop's domain — do not set `'none'`, that breaks embedding)
6. A basic concurrent load test against the dashboard and check-in endpoints

**Exit check:** every item on both checklists is verified, not assumed. This phase is not optional and not something to skip because "it's just a small launch" — the isolation and payment-integrity issues are exactly as real at 10 users as at 10,000, they're just less visible until someone hits them.

## Phase 7.5 — Whop app review readiness (before submitting)
Per WHOP_REFERENCE.md Section 8, confirm every item before submitting Fitz for Whop's app review — these are the most common causes of rejection:
1. Both views (`/experiences/[experienceId]` and `/dashboard/[companyId]`) load without errors on a completely fresh install — no seeded data, no pre-existing clients
2. Empty states are handled gracefully: a coach with zero clients sees a real empty state, not a broken/blank screen; a client with no check-ins yet sees the same
3. Requested permissions (in the app's Whop developer dashboard config) match exactly what the app uses — remove any permission Fitz doesn't actually call. Over-requesting is a common rejection reason.
4. Every webhook endpoint responds correctly to Whop's `send-test-event` call, not just to real traffic observed in your own testing
5. The full `iframeSdk.inAppPurchase()` paywall flow completes successfully in sandbox, start to finish, including the case where the user cancels partway through
6. Run through the app fresh as if reviewing it cold — a reviewer will not read your PRD, so nothing should require prior context to understand

## Phase 8 — Launch
1. Deploy to Vercel, confirm HTTPS/production Whop base URL (not sandbox)
2. Submit app for Whop's review/listing if required
3. Onboard your first 2-3 real coaches manually — watch their actual usage closely before opening broader signup, since real behavior surfaces edge cases sandbox testing won't

## Explicitly deferred to post-launch (do not build now)
Everything in PRD.md Section 6 — reusable templates, full meal logging, in-app messaging, in-app booking, push notifications, exercise video library. Adding any of these before Phase 8 is complete delays the isolation and payment correctness work that actually matters first.

## How to use this with an LLM/coding agent
Hand over the full doc set — README.md, PRD.md, TRD.md, WHOP_REFERENCE.md, SECURITY.md, SCALABILITY.md, UI.md, DECISIONS.md, and this file — at the start of a build session, and point the agent to Phase -1 first. Work one phase at a time — don't let the agent jump ahead to Phase 4 features while Phase 1's isolation test hasn't been manually confirmed. Each phase's "Exit check" is a real test to run, not a checkbox to assume passes because the code compiles. When the agent makes a real architectural or scope decision during the build, add it to DECISIONS.md before moving on — that file is only useful if it stays current.
