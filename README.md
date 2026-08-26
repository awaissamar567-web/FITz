# FITz - Premium Fitness Coaching & Workout Builder App for Whop

FITz is a multi-tenant coaching platform and client companion app built specifically for the **Whop App Store**. It enables fitness coaches and creators to deliver custom workout routines, track client progress, manage weekly photo check-ins with macro adherence, and monetize coaching programs with built-in subscription tiers.

---

## ⚡ Core Features

- **Coach Workspace & Dashboard:**
  - Client roster management with search, filter, and at-risk churn detection.
  - Interactive **7-Day Workout Routine Builder** with freeform split naming (Monday–Sunday) and per-client plan isolation.
  - Per-day exercise creator (sets, reps, target cues, coaching notes).
  - Daily macro target assignment (calories, protein, carbs, fats).
  - Live activity feed showing client check-ins in real-time.

- **Client Experience Portal:**
  - Zero-placeholder onboarding intake questionnaire (fitness goals, body stats, equipment access, injuries/limitations).
  - Daily workout routine view with rest day detection and exercise checklist.
  - Weekly check-in submission with progress photo upload and macro adherence logging.
  - Visual check-in history feed.

- **Enterprise-Grade Security & Isolation:**
  - Strict multi-tenant data isolation scoped by company_id and client_id.
  - IDOR prevention and fail-closed authentication.
  - Standard Webhook HMAC-SHA256 signature verification with idempotent deduplication.

- **Monetization & Paywall Engine:**
  - Free Tier (up to 5 active clients).
  - Seamless in-app upgrade to Whop Pro Plan for unlimited client capacity.

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components & Route Handlers)
- **Styling:** Tailwind CSS with frosted dark-mode glassmorphism design tokens
- **Database & Storage:** Supabase (PostgreSQL with RLS & S3-compatible Storage)
- **Authentication & Billing:** Whop SDK, Whop OAuth, Whop Frosted Glass Theme & Webhooks
- **Language:** TypeScript
