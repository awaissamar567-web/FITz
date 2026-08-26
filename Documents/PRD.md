# PRD: Fitz (Whop App)

## 1. Summary
A Whop-native app that lets a fitness coach manage their client base entirely inside their existing Whop community. One install = one coach. When a client subscribes to the coach's Whop product, they're auto-linked to that coach — no manual matching. Core loop: client checks in → coach reviews progress → coach assigns/updates workouts and macros → client sees their plan.

## 2. Scope Boundaries (what this is NOT, v1)
- Not a booking/calendar system — video calls/consultations link out to existing Whop booking apps
- Not a messaging platform — "message client" links out to Whop's native chat
- Not a food-logging app — no calorie/macro database, no meal diary
- Not a multi-coach platform — always 1 coach per whop install
- Not a certified exercise library with videos — exercises are text fields, coach-authored

## 3. Data Model
```
companies (company_id [Whop], coach_name, default_checkin_frequency, units)
clients   (user_id, company_id, status, joined_at, goal, stats, experience, equipment, limitations)
checkins  (id, client_id, company_id, date, weight, photo_url, macro_hit [bool/number], notes)
plans     (id, client_id, company_id, split_name, exercises[{name, sets, reps}], macros{cal, protein, carbs, fat}, updated_at)
```
All queries scope by `company_id` first. No cross-coach data access — enforced structurally since each install has its own `company_id`.

## 4. Core Features

### 4.1 Client Onboarding
- Client subscribes on Whop → webhook creates client record under coach's `company_id`
- Intake form (goal, stats, experience, equipment/days, limitations) — required, not skippable
- Immediate first check-in (weight + photo) for baseline

### 4.2 Coach Onboarding
- Install via Whop → empty dashboard
- Minimal profile setup: default check-in frequency, units (kg/lbs)
- Empty state explains pipeline ("clients appear here on subscribe")

### 4.3 Coach Dashboard
- **Quick Actions**: link to Whop chat for messaging; "assign routine" shortcut into a client's profile
- **Client Overview**: active client count, onboarding status (intake complete/pending), retention rate
- **Today's Schedule**: read-only list of sessions/calls (manually noted by coach or referenced from booking app — no in-app booking logic)
- **Activity Feed**: chronological list of client check-ins (workout logged, weigh-in, macro hit) — dashboard-only, no push notifications

### 4.4 Client Profile (coach view)
- Check-in history (weight trend, photos, macro adherence over time)
- Current assigned plan
- Assign/edit workout plan: split name + list of exercises (name, sets, reps) — free text fields, no exercise database
- Assign/edit macro targets: calories, protein, carbs, fat

### 4.5 Check-In Flow (client view)
- Scheduled per coach's default frequency (daily/weekly), overridable per client
- Fields: weight, optional photo, macro adherence (hit target y/n or quick numbers), notes
- Submission appears instantly in coach's activity feed

### 4.6 Plan Delivery (client view)
- Client sees current split (exercises/sets/reps) and macro targets
- Updates from coach reflect immediately, no re-fetch needed

## 5. Retention/Churn Signal
Client flagged "at risk" if either:
- Whop subscription status = cancelled/expired, or
- No check-in submitted for N days past their scheduled frequency (coach-configurable threshold, default suggested but editable)

## 6. Explicitly Deferred (v2+)
- Reusable workout/macro templates across clients
- Full meal/food logging
- In-app messaging
- In-app call booking/scheduling
- Push notifications for activity feed
- Exercise video library

## 7. Non-Negotiable Constraint
Every data query must be scoped by `(company_id, client_id)` together — never `client_id` alone. This is the entire security boundary between coaches; it must hold even as features are added later.
