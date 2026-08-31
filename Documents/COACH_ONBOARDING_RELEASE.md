# Coach onboarding and inline checkout release — 2026-08-31

## Implemented

- Removed Whop Hub from the shared coach/member sidebar.
- First-time coach setup: name, whole years of experience (0–80), expertise, optional profile photo. Editable in Coach Settings; one profile per business.
- Private coach photos: JPEG/PNG/WebP, 2 MB, content-signature validation, tenant-scoped paths and temporary signed URLs.
- Native-dialog Pro upgrade popup using the official Whop checkout embed. Local mock previews cannot initiate payments. Checkout never creates or reprices the existing Pro plan.
- Server-created checkout metadata binds the purchase to the authorized coach's business. Production webhooks verify that binding instead of upgrading the merchant business. Browser completion messages alone never grant Pro.
- Replaced browser-only PDF persistence with private, client-scoped uploads (3 MB) and signed download links. Legacy blob URLs cannot be recovered; the coach must re-upload those documents.

## Verification

- Production build completed, including type checking.
- 57 entitlement HTTP checks: Free 3, Pro 250, waiting/history access, role checks, failed-payment downgrade, retained client records, concurrent slot bounds.
- 22 production-boundary checks with dependency doubles: signed-token boundary, tenant checks, production mock rejection, webhook write retry/idempotency.
- 35 profile/checkout module checks with dependency doubles: validation, upload scoping, rollback, metadata tampering, buyer-vs-seller billing attribution, duplicate purchase prevention.
- 16 profile/PDF HTTP checks against isolated mock storage: persistent profile/photo changes, role rejection, private PDF paths, rejected blob/foreign links, local checkout safety.
- Local browser: desktop/mobile onboarding layout, submit to dashboard, profile in settings/sidebar, reload preserving completed setup, upgrade popup and disabled-local-checkout error state. Native dialog supplies modal focus semantics; keyboard behavior was not separately end-to-end tested.
- Production schema 006 verified. Private `coach-avatars` and `workout-documents` buckets verified with intended size/type restrictions; no existing client records or plan prices changed.
- Live Whop API created a checkout configuration for the existing plan without charging anyone. The API response did not return a verifiable metadata binding; callback delivery remains a live acceptance test, not a claimed success.
- Whop app API reports `unlisted`; dashboard/experience/discover paths match configuration. Base URL is permission-redacted in this API response and must be confirmed through the developer UI/live app.

## Final acceptance before submission

1. In production, complete the real coach profile, including an optional photo; reload and edit it.
2. Confirm an actual active member (not an administrator preview) can complete intake and view their assigned routine/PDF.
3. Open Pro checkout in the popup. Complete a real approved test purchase and verify the purchasing workspace becomes Pro after a signed webhook. No automated test here charged a card.
4. Confirm a failed-payment webhook returns that same workspace to Free without deleting data. Local/doubled tests cover logic, not live provider delivery.
5. Inspect the Whop submission form and confirm its final external submission after these acceptance checks. Approval is Whop's decision.

## Operations

Keep `WHOP_API_KEY` and `WHOP_WEBHOOK_SECRET` server-only. Checkout uses `WHOP_APP_ID` or the existing `NEXT_PUBLIC_WHOP_APP_ID` fallback. Keep production on the default Whop API host. Existing checkout bindings are signed using the webhook secret: coordinate secret rotation with billing; unsigned legacy checkout purchases intentionally cannot auto-upgrade a workspace.

Design follows the existing dark FITz surfaces, blue primary actions, display headings, and accessible native form controls rather than introducing a new visual system.
