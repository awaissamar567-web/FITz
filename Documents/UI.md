# UI.md — Fitz
_Design system: Frosted UI (`@whop/react`), built on Radix UI + Tailwind. Two app views per Whop's App Views spec. Desktop-first traditional layout + mobile-first at 19.5:9. Give this file directly to an LLM/agent building the UI._

## 1. Setup (do this before any screen)
```bash
npm install @whop/react
```
```tsx
// app/layout.tsx
import { WhopApp } from "@whop/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WhopApp accentColor="blue" appearance="inherit">
          {children}
        </WhopApp>
      </body>
    </html>
  );
}
```
```ts
// next.config.ts
import { withWhopAppConfig } from "@whop/react/next.config";
export default withWhopAppConfig(nextConfig);
```
```js
// tailwind.config.js
import { frostedThemePlugin } from "@whop/react/tailwind";
export default { content: [...], plugins: [frostedThemePlugin()] };
```
`appearance="inherit"` respects the coach/client's own Whop light/dark preference — don't hardcode light or dark.

## 2. The Two Views

### `/experiences/[experienceId]` → rendered as **Member View** (client)
Gated: `checkAccess({ id: userId, resource_id: experienceId }).has_access === true`

Screens:
1. **Onboarding/intake** — goal, stats, experience, equipment, limitations (from PRD 4.1)
2. **Today** — current plan (split/exercises/reps), macro targets, "log check-in" CTA
3. **Check-in form** — weight, optional photo, macro adherence, notes
4. **History** — past check-ins, weight trend, progress photos

### `/dashboard/[companyId]` → rendered as **Owner View** (coach)
Gated: `checkAccess({ id: userId, resource_id: companyId }).access_level === "admin"`

Screens:
1. **Dashboard home** — quick actions, client overview stats, today's schedule, activity feed (per PRD 4.3)
2. **Client list** — every client under this `company_id` only, searchable/filterable by status
3. **Client profile** — check-in history, current plan, macro targets, assign/edit plan
4. **Upgrade/paywall screen** — shown when client cap is hit (per TRD Section 13)

Both views share components (Card, Badge, etc.) but never share data-fetching logic — each view's data layer is scoped separately per the isolation model in TRD Section 4.

## 3. Design tokens — use these, not raw Tailwind defaults
Frosted UI overrides the default Tailwind scale. `bg-blue-200` will not work with the plugin installed — use `bg-blue-2` etc.

**Typography scale (0–9):**
| Use | Size |
|---|---|
| Small labels, metadata | `1`–`2` |
| Body text | `3` (default) |
| Emphasized body / card titles | `4` |
| Section subheadings | `5` |
| Screen headings | `6` |
| Dashboard page title | `7` |

**Color roles for this app:**
- `accentColor="blue"` — primary actions (assign plan, submit check-in, upgrade)
- `green`/`jade` — active/on-track status badges
- `amber` — at-risk client flags
- `red`/`ruby` — cancelled/churned status, destructive actions
- `gray`/`slate` — secondary text, neutral surfaces

**Color scale usage (12-step):**
- Steps 1–3: card/page backgrounds
- Steps 4–6: borders, dividers between client rows
- Steps 7–9: buttons, interactive elements
- Steps 10–12: text, high-contrast content

## 4. Layout — Desktop (traditional)
Standard breakpoints from Frosted UI: `initial`(0) `xs`(520) `sm`(768) `md`(1024) `lg`(1280) `xl`(1640).

**Owner view (coach dashboard), desktop `lg`+:**
```
┌─────────────┬──────────────────────────────────────┐
│  Sidebar     │  Header (coach name, upgrade badge)   │
│  - Dashboard │──────────────────────────────────────│
│  - Clients   │  Quick Actions row (message/assign)   │
│  - Settings  │  Client Overview stats (3-4 Cards)    │
│              │  Today's Schedule (list/Card)         │
│              │  Activity Feed (scrollable list)       │
└─────────────┴──────────────────────────────────────┘
```
Use `Flex`/`Grid` from Frosted UI for the shell — sidebar fixed width, content area fluid. Client list and client profile are separate routes, not modals, on desktop — a coach with dozens of clients needs real navigation, not a stacked overlay.

**Member view (client), desktop:**
Single-column centered content, max-width constrained (this is a personal fitness screen, not a dense data table) — `Container` component, size 2 or 3.

## 5. Layout — Mobile (19.5:9, e.g. iPhone-class viewport)
Design at `initial` breakpoint (0–520px). 19.5:9 means tall and narrow — prioritize vertical stacking, thumb-reachable primary actions at the bottom of the screen, not the top.

**Owner view, mobile:**
- Sidebar collapses to a bottom tab bar or `Drawer` (Frosted UI's `Drawer` component) — Dashboard / Clients / Settings
- Quick Actions become a horizontal scroll row of icon buttons, not a full row of labeled buttons
- Stats cards stack vertically full-width, not side-by-side
- Client list: single-column list with `Avatar` + name + status `Badge`, tap to open client profile as a full-screen push (not a dialog)

**Member view, mobile:**
- This is the primary use case — clients will overwhelmingly use this on mobile, design here first
- Check-in form: one field group visible at a time is not necessary at this length (4-5 fields), but keep the submit button pinned/sticky at the bottom of the viewport, thumb-reachable
- Photo upload: large tap target, camera-roll or camera capture, not a tiny file input
- Today screen: plan and macros as stacked `Card`s, scrollable — no horizontal scrolling anywhere

**Universal mobile rule:** no component wider than the viewport, no fixed-width elements that assume desktop space. Use responsive props (`size={{ initial: "2", md: "4" }}`) rather than separate mobile/desktop component trees where Frosted UI supports it.

## 6. Key components mapped to this app's screens
| Screen element | Frosted UI component |
|---|---|
| Client cap upgrade prompt | `Dialog` (desktop) — full-screen sheet equivalent on mobile |
| Status flags (active/at-risk/cancelled) | `Badge` with semantic color |
| Client list row | `Card` + `Avatar` + `Badge` |
| Assign plan form | `TextInput`, `TextArea`, `Select` for split fields |
| Check-in submission | `TextInput` (weight), file upload, `Checkbox`/toggle for macro hit |
| Dashboard stat tiles | `Card` + `Heading` + `Text` |
| Navigation (owner, mobile) | `Drawer` or bottom nav built from `Flex` + `IconButton` |
| Loading states | `Skeleton`, `Spinner` |
| Confirm destructive actions (remove client) | `AlertDialog` |

## 7. What NOT to build custom
Don't hand-roll any of these — Frosted UI already has them and they're accessibility-tested: buttons, dialogs, form inputs, tabs, tooltips, dropdowns, avatars, badges, progress indicators. Custom CSS should be limited to this app's specific layout shell (sidebar, dashboard grid) — not re-implementing components the library already provides.
