# Coaching capacity and Pro gates — release check

Date: 2026-08-31. Status: implemented and tested locally; user applied the production migration and column availability is verified. Production deployment pending at this report's release commit.

## Behavior implemented

| Capability | Free | Pro |
| --- | --- | --- |
| Selected active coaching clients | 3 | 250 |
| Full membership roster and existing history | Retained | Retained |
| Custom seven-day workouts, intake, weight and member notes | Enabled for selected clients | Enabled for selected clients |
| Reusable program library | Locked | Enabled |
| Automated churn queue | Locked | Enabled for selected clients |
| Progress-photo uploads, macro targets/tracking, coach feedback | Locked | Enabled for selected clients |

Membership records do not consume capacity merely by existing. Coaches choose which active members to coach in Clients & Roster. Unselected members cannot submit new intake/check-ins or receive new workout assignments; existing history remains readable while their Whop access remains valid. No memberships are cancelled or deleted to free a slot.

Before a coach saves a selection, the oldest eligible clients are selected deterministically. An explicitly saved empty selection stays empty. Separate Free and Pro selections survive tier changes. After a failed-payment downgrade, the saved Free selection is restored, or the oldest three are used if no selection was saved. Pro is capped at 250, including when more than 250 membership records exist.

API authorization is enforced independently of hidden or disabled UI controls. Members cannot choose slots or supply another tenant's company ID. Production ignores test identities and demo flags. An admin whose experience-to-company resolution fails now receives a coach-specific retry message instead of falling through into member intake.

## Verification

- `node scripts/verify-entitlements.mjs`: **57 passing HTTP checks**, isolated local mock storage.
- `node scripts/verify-production-boundaries.mjs`: **22 passing checks**, actual modules run with production flags and dependency doubles. No live token verification or real payment is implied.
- `npm run build`: production build and TypeScript validation passed during verification.
- `git diff --check`: passed.
- Static browser chunks checked for server credential identifiers and the server template-library identifier: no matches. This is not a comprehensive penetration test or proof that every bundle is secret-free.

Coverage includes seven-member Free rosters, the 250/251 boundary in a 257-member roster, selection changes, zero selections, concurrent selection requests, downgrade preservation, cancelled/reactivated clients, stale Pro access, cross-tenant selection, ordinary-member/revoked-admin denial, malformed JSON, direct macro/photo/template/feedback bypass attempts, unsigned payment rejection, persistent feedback, and retry after a subscription write fails.

The webhook retry test doubles signature parsing to isolate persistence behavior. The HTTP suite separately rejects unsigned events using the real handler. Successful payment events in these tests are synthetic local events, not live purchases.

## Browser QA

- Desktop Free roster: saved a different set of three, reloaded, and verified it persisted; four paused assignment buttons were disabled.
- Free workout builder: saved a custom workout despite seven total members; dashboard showed one of three enabled clients assigned.
- Free member: submitted weight and training notes and read them back in history; premium inputs were not exposed.
- Unselected member: clear waiting-for-coaching-slot screen, not an invalid-membership error.
- Mobile 390px: coaching selection and navigation fit; document width stayed within the viewport.
- Pro: dashboard expands coaching capacity, the four-template library loads, and the persistent feedback form is available. Feedback saved successfully and appeared in the member's history after a fresh page load.

The interface-design and better-ui guidance was used to preserve the current FITz palette/typography, distinguish pending selections from saved access, keep keyboard focus visible, and use clear disabled and locked states rather than a whole-dashboard paywall.

## Production migration verification

After the user reported a successful migration, zero-row read-only queries of the locally configured live Supabase project confirmed:

- `companies.free_client_ids`: available.
- `companies.pro_client_ids`: available.
- `checkins.coach_feedback`: available.

The user applied `supabase/migrations/005_coaching_entitlements.sql`. It adds nullable selection arrays, capacity constraints, and an idempotent feedback column addition; it does not delete member data or modify a Whop plan.

`node scripts/check-entitlements-schema.mjs` completed successfully with all columns reporting AVAILABLE. This script performs zero-row reads, not data mutations, and never prints credentials. Column checks do not independently prove the constraints are present; the user reported the migration transaction succeeded.

The agent did not run the production migration or alter a Whop plan. Whop publication and live checkout remain user-controlled. Deployment status is reported separately after the release commit.

## Release order and remaining live checks

1. Migration reported successful by user; columns verified. Independently inspect both `companies_free_capacity` and `companies_pro_capacity` constraints if checking the database release checklist.
2. Deploy the tested source to the existing Vercel production project. Keep the current Whop app/plan IDs, production base URL and route placeholders. Do not enable a demo runtime or use sandbox API URLs in production.
3. From a real coach business with more than three members, save three Free choices, refresh, and verify selected versus waiting member access in separate signed-in member sessions.
4. Perform the user-controlled payment test. Confirm the purchasing coach's business—not merely the seller's business—receives Pro. Confirm actual signed webhook delivery, plan identification and the correct company association; synthetic payloads cannot establish this.
5. Check a failed renewal/deactivation returns that business to Free, preserves history, and blocks Pro APIs. Verify private photo storage and feedback with real Supabase data.
6. Only submit after those checks pass. These test results do not guarantee Whop approval.

Existing issue observed outside this entitlement change: the optional PDF attachment widget currently stores a browser `blob:` URL rather than uploading a persistent file. Do not advertise this as a working cross-device PDF delivery feature until it has persistent storage or is removed from the release. Live checkout company association and broader legacy test suites were not certified by this work.

## Updates after publication

The hosted UI and features can continue to evolve using deployments to the same app. Whop supports updating app configuration; additional permissions require existing installers to re-approve them before the new API calls work. Keep old data and routes compatible when releasing updates. Marketplace approval remains Whop's decision.

References: [Whop app updates](https://docs.whop.com/api-reference/apps/update-app), [Whop permission changes](https://docs.whop.com/developer/guides/permissions).

## Reproducing local tests

Start a separate dev process on port 3100 with `FITZ_BUILD_DIR=.next-test`, `FITZ_DEMO_MODE=true`, mock Supabase URL/key, `WHOP_API_KEY=mock-test-key`, an empty temporary developer key, a mock webhook secret, and both Pro plan variables set to `plan_fitz_pro`. Do not change `.env.local` or production variables to these mock values.

Run the two verification scripts above. They use synthetic fixtures; the HTTP suite requires the mock-only seed endpoint to succeed before continuing. `scripts/preview-entitlements.mjs` provides loopback-only coach/member preview proxies for browser QA. Use a fresh mock server for a clean fixture run.
