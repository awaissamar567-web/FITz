# SCALABILITY.md — Fitz
_Target: comfortably support 10,000+ concurrent users (coaches + their clients combined) without a backend rebuild. This maps your app onto the "~10,000 concurrent users" stage of the Next.js/Vercel/Supabase scaling model — the stage where database and cache design start to matter more than raw code._

## What "10,000 users" actually means for this app
Not 10,000 people hammering the API at once. Realistically: a few thousand coaches, each with a handful to dozens of clients, mostly doing low-frequency actions (daily check-in, occasional plan view, dashboard glance). This is a **read-heavy, low-write, mostly-personalized** workload — good news, because it's much easier to scale than a real-time chat app or public feed.

## The stack decision, and why it holds
- **Next.js on Vercel** — serverless, autoscales automatically, no server to manage
- **Supabase (Postgres + Storage + Realtime)** — one system instead of three, less to misconfigure
- **Vercel for hosting/domain only** — correct as scoped earlier

This combination is explicitly validated for the 100 → 10,000 user range without architecture changes, **provided the database is protected correctly** — that's the part that actually needs deliberate work, not the framework choice.

## 1. Query discipline (this matters more than server hardware)
Every query must be:
- **Filtered** — `company_id` + relevant index, never `select *` on an unfiltered table
- **Paginated** — check-in history and client lists use keyset pagination (`where created_at < last_seen`), not offset pagination that gets slower as data grows
- **Projected** — return only the fields the view actually needs, not full row dumps

## 2. Indexes — add these before launch, not after it's slow
```sql
create index on clients (company_id, status);
create index on checkins (company_id, client_id, date desc);
create index on plans (company_id, client_id);
```
These match your actual access patterns: "this coach's active clients," "this client's check-in history," "this client's current plan." Add more only from real `EXPLAIN ANALYZE` output later — don't guess further ahead of time.

## 3. RLS performance (not just correctness)
RLS policies get evaluated per-row — an unindexed policy column becomes a full table scan at scale. Since your RLS policies filter on `company_id`, and that's already indexed above, this stays cheap. Confirm with `EXPLAIN ANALYZE` comparing RLS on vs off before launch — this is a five-minute check that prevents a real production slowdown later.

## 4. Connection pooling — the single most common scaling mistake
Vercel functions can spin up far faster than Postgres can open connections. Never open a raw/direct Postgres connection per request.
- Use Supabase's **transaction-mode pooler** for all serverless/API-route database access
- Reserve the direct connection only for migrations
- This alone is usually the difference between "works at 100 users, falls over at 2,000" and holding steady well past 10,000

## 5. Caching — reduce work before it reaches the database
- **Coach's own dashboard/client list**: personalized, don't cache publicly, but this data changes infrequently (a check-in a few times a week per client) — a short server-side cache (e.g. 30-60s) per coach cuts repeat-load database hits significantly without staleness anyone will notice
- **Nothing in this app is truly public** (no marketing pages need this treatment beyond your landing page, which is a separate concern from the app itself)
- Don't cache anything containing another coach's data under a shared key — every cache key must include the coach's `company_id`

## 6. Realtime — the one component with an explicit connection cap
Supabase Realtime has a documented connection ceiling per plan (10,000 concurrent on Pro/Team). At full scale, thousands of coaches with open dashboard tabs is realistic — worth knowing now, not discovering at 8,000 users.
- Scope every Realtime subscription to `company_id` — never a shared/global channel
- If dashboard tabs are typically left open, consider whether the activity feed truly needs live push vs. a refresh-on-focus pattern — cuts persistent connections significantly for a UX difference most users won't notice
- Monitor actual concurrent Realtime connections against your Supabase plan's limit as you grow — this is a genuine ceiling, not just a performance tune

## 7. Async work — keep the request path short
Nothing in this app currently needs heavy background processing, but as it grows:
- Photo uploads should go straight to Supabase Storage from the client (signed upload), not proxied through a Vercel function
- The daily "flag at-risk clients" job belongs in a Supabase Edge Function on a schedule, not computed on every dashboard load (already specified this way in the TRD — correct call)

## 8. What you do NOT need at 10,000 users
Being explicit about this matters for a solo builder — don't build for a problem you don't have yet:
- No multi-region database or read replicas
- No microservices or separate backend service
- No message queue/job system beyond Supabase's built-in scheduled functions
- No CDN-first architecture beyond what Vercel already gives you by default
- No manual connection pool tuning beyond "use the transaction pooler"

10,000 users on this shape of app (personalized, low-frequency writes, small per-tenant datasets) does not require Internet-scale infrastructure. It requires the basics done correctly: indexed queries, RLS that doesn't scan, pooled connections, and a Realtime scope that doesn't leak. All four are covered above.

## 9. When to actually revisit this document
Only when you have real numbers, not before:
- Database CPU consistently high in Supabase's dashboard
- `EXPLAIN ANALYZE` on a real query shows "Rows Removed by Filter" is large relative to rows returned (RLS is scanning too much)
- Connection pool wait times rising in Supabase's connection monitoring
- Realtime connection count approaching your plan's ceiling

None of these should show up from normal growth if items 1–7 are in place from launch. This is the honest answer to "will I have to rebuild the backend" — no, not at this scale, as long as the database work stays bounded and indexed from day one.

## Pre-launch scalability checklist
1. Indexes above are created via migration, not manually in the Supabase UI (so they're reproducible)
2. Transaction pooler confirmed as the connection method for all API routes
3. `EXPLAIN ANALYZE` run on the three main dashboard queries with realistic seeded data (hundreds of clients, thousands of check-ins) — not a 10-row dev database
4. Realtime subscriptions confirmed scoped per-`company_id`, never global
5. A basic load test (even a simple script hitting the dashboard endpoint concurrently) before considering this "launch-ready" — confirms the theory holds under real concurrent load, not just single-request testing
