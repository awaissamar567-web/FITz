# WHOP_REFERENCE.md — Fitz
_Curated from the complete Whop developer documentation index (919 pages). This file extracts only what's relevant to Fitz's build — not everything Whop offers, since most of their docs cover things Fitz doesn't use (ads, courses, connected-account platforms, physical shipments, crypto wallets, etc.). Read this before writing any code. When something here is unclear or seems to have changed, fetch the canonical URL listed — Whop's docs are the source of truth, this file is a map to them._

## How to use this file
Each section names the concept, the canonical doc URL(s), and what it means specifically for Fitz. Read the actual docs before implementing — this file tells you *what to go read*, not a full substitute for reading it.

## 1. Core setup (read first, in order)
1. `https://docs.whop.com/developer/start.md` — pick the integration path (Fitz is: build a Whop App with two views, using Frosted UI, accepting recurring payments)
2. `https://docs.whop.com/developer/guides/sandbox.md` — how to test safely before going live. **Do this before writing a single line of production-path code.**
3. `https://docs.whop.com/developer/concepts.md` — the account model, how money moves. Read this to actually understand `company_id`/account relationships, not just copy the pattern.
4. `https://docs.whop.com/developer/api/quickstart.md` and `getting-started.md` — first SDK call, first webhook test.
5. `https://docs.whop.com/developer/api/idempotency.md` — **critical for Fitz.** Every POST that creates state (webhook processing, client creation, plan updates) should use idempotency keys where Whop's API supports them, on top of the app's own idempotent webhook handling from SECURITY.md.

## 2. Authentication & Authorization (the isolation foundation)
- `https://docs.whop.com/developer/guides/authentication.md` — verify the current user, check access level. This is TRD Section 3, verbatim from Whop's own docs.
- `https://docs.whop.com/developer/guides/permissions.md` — configure what permissions Fitz requests when a coach installs it. **Request the minimum set Fitz actually needs** — every extra permission requested is a slower app review and a bigger attack surface if compromised. Fitz needs: read membership/user data, send webhooks, in-app purchase for the paywall. It does NOT need ads, wallet, or card permissions.
- `https://docs.whop.com/developer/guides/app-views.md` — the two-view system (experience view for clients, dashboard view for coaches), already applied in UI.md Section 2.
- `https://docs.whop.com/developer/guides/oauth.md` — not needed for Fitz's core flow (the iframe token model handles auth), but relevant only if Fitz ever adds a standalone website outside the Whop iframe.

## 3. Frosted UI (design system) — already covered in UI.md
Canonical: `https://docs.whop.com/developer/guides/frosted_ui.md`. UI.md in this doc set already extracts the setup, tokens, breakpoints, and component mapping. Re-read the canonical page if a specific component's props are unclear — Frosted UI has 60+ components and UI.md only mapped the ones Fitz needs.

## 4. Payments — coach's subscription to Fitz (the paywall)
- `https://docs.whop.com/developer/guides/accept-payments.md` — recurring payments, 100+ payment methods, 195 countries. This is what powers the Fitz Pro tier.
- Checkout Configurations: `https://docs.whop.com/api-reference/checkout-configurations/create-a-checkout-configuration.md` and `retrieve-a-checkout-configuration.md` — **note: these two URLs returned errors during doc retrieval on 2026-08-24.** Confirm against `https://docs.whop.com/api-reference/beta/checkout-configurations/` (the beta equivalents, which did retrieve successfully) before implementing — the beta version may be the current canonical path.
- `https://docs.whop.com/developer/api/versioning.md` — **pin Fitz's API calls to a dated version.** Don't call the API unversioned; Whop's API can change, and an unpinned integration can break without warning. This directly protects against the "unstable base" your scalability concern is about.
- Membership webhooks: `https://docs.whop.com/api-reference/memberships/membership-activated.md`, `membership-deactivated.md` — already the basis of TRD Section 6. Also review `membership-cancel-at-period-end-changed.md` — relevant if Fitz wants to show a coach "your subscription ends on X" rather than only reacting at the hard cancellation.
- `https://docs.whop.com/developer/guides/refunds-and-disputes.md` — understand what happens to Fitz's revenue/access if a coach disputes a charge. Not urgent for MVP, but know the flow exists before it happens.

## 5. Webhooks — the event system
- `https://docs.whop.com/developer/guides/webhooks.md` — the general guide, already the basis of TRD Section 6.
- `https://docs.whop.com/api-reference/webhooks/create-webhook.md`, `send-test-event.md`, `list-deliveries.md` — **use `send-test-event` and `list-deliveries` during Phase 2 testing** (per IMPLEMENTATION_PLAN.md) to actually verify signature checking and idempotent processing work, not just assume they do from reading the code.
- **Note:** `notifications/send-notification.md` also returned a retrieval error on 2026-08-24 — if Fitz later adds push notifications (currently deferred per PRD Section 6), check the beta equivalent path first.

## 6. Chat — for the "message client" quick action
Fitz links out to Whop's native chat rather than building its own (per earlier scoping decision). Relevant docs if that changes later:
- `https://docs.whop.com/developer/guides/chat/quickstart.md`, `channels.md`, `direct-messages.md`
For now, Fitz only needs to construct a link/deep-link into the existing Whop chat for a given member — check `https://docs.whop.com/developer/guides/chat/channels.md` for how channels tie to companies/experiences so the link target is correct.

## 7. File uploads — progress photos
- `https://docs.whop.com/developer/guides/upload-files.md` — Whop's own file upload guide. **Decision point:** Fitz's TRD currently specifies direct-to-Supabase-Storage uploads (bypassing Whop entirely) for check-in photos, since these are Fitz's own app data, not Whop platform content. This is correct — don't route client photo uploads through Whop's file API, that's for Whop-platform-level content (app icons, course materials, etc.), not per-user app data. Keep this decision as-is; this section is here so the LLM building this understands *why* it's not using Whop's upload API, rather than "discovering" it later and second-guessing the architecture.

## 8. App Store submission & review — what gets an app rejected
Canonical: `https://docs.whop.com/whop-apps/whop-app-store.md`, `https://docs.whop.com/whop-apps/what-are-whop-apps.md`
Before submitting Fitz for review, confirm against these pages directly (they weren't fully detailed in the index descriptions available) for the current review checklist, but the safe defaults based on the broader documentation are:
- Both required views (`/experiences/[experienceId]` and `/dashboard/[companyId]`) must load without errors for a fresh install — this is the single most common rejection cause for apps with a dashboard+experience split.
- Requested permissions (Section 2 above) must match what the app actually uses — over-requesting permissions is flagged in review.
- The app must handle the "empty state" gracefully — a coach with zero clients, a client with no check-ins yet — reviewers test fresh installs, not populated demo data.
- Webhook endpoints must respond correctly to Whop's test event (`send-test-event`) before submission.
- If charging via in-app purchase (Section 4), the checkout flow must complete successfully in sandbox before submission — test the full `iframeSdk.inAppPurchase()` flow, not just that the button renders.

## 9. Trust & Safety — what NOT to build into Fitz
- `https://docs.whop.com/trust-and-safety/trust-safety-overview/what-is-not-allowed-on-whop.md` and `prohibited-categories.md` — confirm coaching/fitness content stays within allowed categories (it does — `https://docs.whop.com/supported-business-models/coaches.md` explicitly covers coaching businesses as a supported model on Whop).
- Fitz should avoid collecting or displaying anything that could read as medical advice/diagnosis — it's a fitness check-in tool, not a healthcare app. Keep macro/weight tracking framed as coach-directed fitness coaching, consistent with how PRD.md already scoped it (no full food logging, no medical claims).

## 10. What Fitz explicitly does NOT need from this documentation set
To keep scope honest — most of Whop's 919 docs pages don't apply here. Skip these entirely unless a future feature explicitly requires them:
- Ads, campaigns, audiences, social account connections
- Courses/lessons (Fitz's "plan" is not a Whop Course — it's Fitz's own data model)
- Connected accounts / platform payouts (Fitz isn't a payments platform for others)
- Card issuing, wallet, crypto swaps, deposits
- Bounties, affiliates (unless Fitz later wants an affiliate program for coach acquisition — not MVP)
- React Native guide (Fitz is a web app, not a native mobile build, per the "mobile-first web" scoping in UI.md)
- Websites/whop.app hosting guide (Fitz is a full app with both views, not a whop.app static/hosted site)

## 11. Retrieval caveats (from the doc pull that produced this file)
Six URLs failed to retrieve on 2026-08-24 during the research that built this reference: two checkout-configuration pages, the send-notification page, the MCP endpoint, and both OpenAPI spec files. Where this file references any of those six, confirm against the current docs.whop.com page directly before relying on the exact request/response shape — the beta API equivalents for the checkout-configuration and notification endpoints did retrieve successfully and are the more likely current canonical path.
