# DECISIONS.md — Fitz
_A running log of decisions and why they were made, so a future session (human or LLM) doesn't relitigate settled questions. Append new entries as decisions are made; don't rewrite history — if a decision changes later, add a new entry noting the change and why, rather than editing the old one._

## Business model & scope
- **1 coach per Whop install, not multi-coach per whop.** Simplifies the entire isolation model — `company_id` IS the coach, no client-to-coach matching layer needed at all.
- **Client assignment is automatic, not requested.** Client subscribes to the coach's Whop product → webhook creates their record → first thing they see is the intake form. No approval step, no coach picking.
- **Sold as SaaS on Whop to many coaches**, not a custom build for one client (e.g. not built specifically for Noor/Koach — that's a separate, unrelated project).
- **App name: Fitz.**

## Deliberately deferred to v2+ (see PRD.md Section 6 for the full list)
- Full food/meal logging — chosen macro-adherence-check instead (calories/protein hit y/n or quick numbers, optional photo). Reasoning: full food logging is the highest-effort feature for the client to maintain and the #1 reason fitness apps get abandoned; coaches need signal, not a food diary.
- In-app messaging — link out to Whop's native chat instead. Building custom messaging is expensive for close-to-zero differentiation over what Whop already provides.
- In-app call booking — read-only schedule reference instead; booking apps already exist on Whop, no need to rebuild one.
- Push notifications for the activity feed — dashboard-only feed for MVP; push adds complexity without being requested.
- Reusable workout/macro templates — correct v2 priority (cuts coach time-per-client at scale) but not MVP.

## Stack decisions
- **Next.js + Supabase (Postgres/Storage/Realtime) + Vercel hosting.** Chosen over splitting storage/db/realtime across separate providers — one system is fewer moving parts for a solo, non-technical-by-self-description builder to reason about and secure correctly.
- **Vercel for hosting/domain only, not database.** Explicit choice to avoid Vercel Postgres/KV — Supabase covers all data needs in one place.
- **Whop's own in-app purchase flow for the coach paywall**, not a separate Stripe integration — avoids maintaining a second payment system when Whop already handles this natively for both the client→coach and coach→Fitz payment relationships.

## Isolation model (the highest-stakes decision in this project)
- **Three-layer defense, not one:** Whop's own `checkAccess` (layer 1) + app-layer query filters (layer 2) + Postgres RLS (layer 3). Reasoning, directly from the user's stated top concern: a single-layer approach (app code remembering to filter) is exactly the failure mode that broke isolation in prior projects. RLS specifically was chosen because it makes the isolation non-optional at the database level — a forgotten filter in application code still can't leak data.
- **`company_id` denormalized onto every child table** (`checkins`, `plans` each carry their own `company_id`, not just inherited via a `client_id` join). Deliberate redundancy: lets every RLS policy and index filter directly without a join, for both security and query speed at scale.
- **Isolation testing happens in Phase 1 of the implementation plan, before any feature work**, not saved for a pre-launch audit. Reasoning: catching a broken foundation early is cheap; catching it after five features are built on top of it is not.

## Paywall design
- **Free tier: 3 active clients.** This is the current product limit before a coach must upgrade to Pro.
- **Usage cap over feature-gating.** A coach who's already gotten value from the app and hits a cap tied to their own growth is an easier upgrade conversation than one facing an arbitrarily locked feature before they've experienced the product.
- **Plan status flips only from the verified webhook, never the client-side purchase result.** A dropped connection mid-purchase must never leave the UI falsely claiming upgraded access.

## UI decisions
- **Frosted UI (Whop's own design system)**, not a custom component library — matches the native Whop look-and-feel coaches/clients already expect, and avoids maintaining custom accessible components Frosted UI already provides.
- **Two separate view routes** (`/experiences/[experienceId]` for clients, `/dashboard/[companyId]` for coaches), matching Whop's App Views spec exactly rather than building custom routing/gating logic on top of it.
- **Desktop-first traditional layout for the coach dashboard; mobile-first for the client experience.** Reasoning: clients will overwhelmingly use Fitz on their phone day-to-day (check-ins, viewing plans); coaches doing plan assignment and reviewing multiple clients benefit more from a real desktop workspace, though the dashboard still needs to be usable on mobile for quick checks.

## Open questions (not yet decided — flag before building the related feature)
- Data retention policy for cancelled clients: soft-delete (status flag, data retained) is recommended in TRD.md Section on data retention, but not yet explicitly confirmed by the user as final.
- Whether Fitz will eventually support an affiliate program for coach acquisition (Whop supports this natively) — not needed for MVP, revisit post-launch.

## Implementation details (Phase 0)
- **Next.js 15 + React 19:** `@whop/react@0.1.0` specifies `react@^19.0.0` as a peer dependency. Project initialized on Next.js 15.5+ and React 19 with async page params (`params: Promise<{...}>`).
- **Whop JWT Payload Extraction:** `extractUserIdFromToken` helper added to safely extract the caller's `userId` / `sub` from the incoming `x-whop-user-token` header prior to server-side `whopsdk.users.checkAccess()` verification.
- **Fail-Closed Auth Architecture:** All auth checks in `lib/whop-auth.ts` throw upon missing tokens, invalid JWTs, or failed access checks, preventing any unauthorized fallback.

## Implementation details (Phase 1)
- **On-Demand Tenant Auto-Provisioning:** When an authenticated coach first accesses `/dashboard/[companyId]`, their `companies` record is lazily provisioned in Supabase via `getOrCreateCompany()` with default settings (weekly check-in frequency, kg units, free tier).
- **AccessDenied Component Security Boundary:** Authorization rejections render a standardized `AccessDenied` UI with a 403 response pattern, displaying clear member/admin access requirements without leaking internal DB errors or other tenant names.
- **Continuous Multi-Tenant Verification Suite:** Created `scripts/verify-isolation.mjs` test runner to verify cross-tenant security and URL tampering resistance across 9 distinct authorization scenarios (Coach A vs Coach B, Member vs Non-Member, unauthenticated, and forged tokens).

## Implementation details (Phase 2)
- **Denormalized `company_id` on all Child Tables:** `clients`, `checkins`, and `plans` each maintain an explicit `company_id` foreign key. This eliminates cross-table joins during Postgres RLS evaluation and ensures high-performance composite index scans (`company_id, status`, `company_id, client_id, date desc`).
- **Webhook Idempotency via `webhook_events` Table:** Incoming Whop webhook events are stored by unique `whop_event_id`. Duplicate or replayed deliveries are intercepted and return `200 OK` without creating duplicate client rows or triggering double state mutations.
- **Soft-Delete on Cancellation:** `membership.deactivated` sets `clients.status = 'cancelled'` rather than hard-deleting the row, preserving client check-in history and plans in case the member resubscribes.
- **Client Reactivation:** If a cancelled member re-subscribes (`membership.activated`), `createOrReactivateClient` reactivates the existing client record rather than inserting a duplicate record.

## Implementation details (Phase 3)
- **Unskippable Onboarding Intake Guard:** If `client.intake_completed === false`, `ClientPortal` intercepts and renders `IntakeForm` before permitting access to workout routines or history.
- **Direct IDOR Protection on Check-In & Plan APIs:** All member API routes (`/api/client/checkin`, `/api/client/plan`, `/api/client/intake`) derive client identity strictly from the verified Whop JWT `sub` (or test token in test harness) mapped via `getClientByWhopUserId(company.id, userId)`. Query parameter manipulation (e.g. `clientId=target_uuid`) triggers an immediate 403 Forbidden rejection when mismatched with the authenticated client.
- **Private Storage Path Architecture:** Check-in photos are uploaded to private bucket with scoped convention `${company_id}/${client_id}/${timestamp}_${random}.${ext}` with strict MIME validation (JPEG, PNG, WebP).

## Implementation details (Phase 4)
- **Coach-Scoped Client Roster & Profile API:** `/api/coach/clients` and `/api/coach/clients/[clientId]` are strictly authenticated with `evaluateWhopAccess(userId, companyId)` requiring `admin` role. Cross-tenant reads return 403/404 immediately.
- **Cross-Tenant Plan Assignment Protection:** `/api/coach/plans` verifies that both the coach has admin permissions for `company_id` and the targeted `client_id` belongs to that exact `company_id`. Cross-tenant writes are strictly rejected (404/403).
- **Realtime Activity Feed:** Live check-in activity feed on coach dashboard listens to and queries incoming check-ins filtered strictly by `company_id = coach_company_id`.

## Implementation details (Phase 5)
- **Multi-Factor At-Risk Engine:** Automated churn evaluation classifies clients as `at_risk` when:
  1. 5+ days have elapsed since joining with no initial check-in logged.
  2. 10+ days have elapsed since last check-in under weekly check-in frequency.
  3. 3+ days have elapsed since last check-in under daily check-in frequency.
- **Auto-Recovery on Check-In:** When an `at_risk` client logs a new check-in, their status is automatically recovered to `active`.
- **Preservation of Cancelled Status:** Clients with `status === 'cancelled'` are excluded from churn flagging to preserve deactivation states.
- **Urgent Visual Cues & Direct Re-Engagement:** Highlighted with amber badge and direct "Message on Whop" quick action button in the coach roster.

## Implementation details (Phase 6)
- **3-Active Client Free Tier Cap:** Enforced across the coach workspace (`active` and `at_risk` count). Exceeding 3 active clients disables additional plan assignment with a `402 Payment Required` paywall barrier.
- **Whop In-App Purchase Integration:** Built `PaywallBanner` and `PaywallModal` presenting clear value proposition, Pro tier feature breakdown, and direct checkout trigger to Whop's native In-App Purchase modal.
- **Asynchronous Webhook-Only Tier Transition:** In compliance with DECISIONS.md #30, `companies.plan` flips strictly via verified Whop SaaS subscription webhooks (`membership.activated` / `payment.succeeded` for Fitz Pro plan), never via unverified client-side state.

## Implementation details (Phase 7)
- **Whop Iframe CSP & Security Headers:** `next.config.mjs` enforces `Content-Security-Policy: frame-ancestors 'self' https://whop.com https://*.whop.com;` to enable embedded Whop iframe rendering while preventing third-party clickjacking.
- **Client Secret Zero-Exposure Guarantee:** Confirmed complete absence of `SUPABASE_SERVICE_ROLE_KEY`, `WHOP_API_KEY`, and `WHOP_CLIENT_SECRET` in all client components, browser bundles, and public variables.
- **In-Memory & Edge Rate Limiting:** Implemented `lib/rate-limiter.ts` to protect check-in submissions (10 req/min) and photo uploads (5 req/min) against rapid automated bursts with `429 Too Many Requests` responses.
- **100-Client Performance Validation:** Evaluated 100-client roster retrieval under Pro tier with check-in history, clocking at ~43ms (well under the 1500ms latency budget).






