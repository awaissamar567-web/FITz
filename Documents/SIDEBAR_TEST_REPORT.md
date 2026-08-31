# Collapsible coach and member sidebars

Verified locally on 2026-08-31. This report does not claim a production deployment or Whop submission.

## Implementation

- Both desktop views use `components/ui/WorkspaceSidebar.tsx`.
- The chevron toggles between the existing 256px sidebar and an 80px icon rail.
- Coach and member preferences have separate local-storage keys. If embedded-browser storage is blocked, toggling still works for the current mount.
- Native buttons retain accessible names, current-page state, visible keyboard focus, and compact-mode titles. The collapse control exposes its expanded state.
- Free-tier usage and Upgrade to Pro remain available in compact mode; Pro status and the member training goal remain represented.
- Header, expand control, and footer remain reachable while navigation scrolls on short screens.
- Mobile bottom navigation and all authentication/entitlement logic are unchanged.

## Verified

- TypeScript check and production build passed.
- All 57 local entitlement checks and 22 production-boundary checks passed (79 total, using mocks/dependency doubles rather than live payments).
- All six coach tabs and all five member tabs opened from the compact rail.
- Collapse and expansion worked in both views; measured widths were 80px and 256px.
- Both preferences survived reload; coach Refresh also preserved compact mode.
- The compact coach Upgrade to Pro button opened the existing upgrade modal. No checkout or payment was attempted.
- Screenshots inspected for both expanded and compact desktop states.
- At 390px mobile width, sidebars were hidden, bottom navigation remained visible, and neither view overflowed horizontally.
- At 1000×600, navigation scrolled independently and the toggle and Whop Hub remained on screen.
- No new decorative outlines or layout animations; keyboard-focus styling is retained.

## Not verified here

- Actual keyboard activation: background-browser keypress calls did not produce a reliable state change. The controls use native buttons; no custom keyboard handler was added to compensate for automation behavior. Manually confirm Tab, Enter, and Space in the foreground app before release sign-off.
- Storage-denied behavior and a real Whop embedded-session persistence test (the implementation catches storage errors).
- Live member and payment acceptance tests, the existing PDF persistence issue, and Whop submission remain separate release checks.
