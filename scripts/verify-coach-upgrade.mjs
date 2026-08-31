import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";

// Production-mode module tests with isolated doubles: no real uploads or charges.
const env = { NODE_ENV: "production", WHOP_WEBHOOK_SECRET: "test-only-secret", WHOP_PRO_PLAN_ID: "plan_testpro", WHOP_APP_ID: "app_test" };
function load(path, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Buffer, URL, File, FormData, console, process: { env }, require: name => { assert.ok(name in deps, `Unexpected dependency ${name}`); return deps[name]; } });
  return module.exports;
}
let count = 0;
function check(condition, label) { assert.ok(condition, label); console.log(`PASS ${label}`); count++; }
const profile = load("lib/coach-profile.ts");
const billing = load("lib/billing-checkout.ts", { "node:crypto": crypto });
check(profile.validateCoachProfile("Coach", 0, "Strength") === null, "zero years is accepted for new coaches");
for (const value of [-1, 81, 1.5, NaN, "5"]) check(Boolean(profile.validateCoachProfile("Coach", value, "Strength")), `invalid experience ${value} rejected`);
check(Boolean(profile.validateCoachProfile(" ", 5, "Strength")), "blank name rejected");
check(Boolean(profile.validateCoachProfile("Coach", 5, "a")), "missing expertise rejected");
check(!profile.hasCoachProfile({ coach_name: "Coach" }), "legacy coach enters onboarding");
check(profile.hasCoachProfile({ coach_name: "Coach", coach_expertise: "Strength", coach_years_experience: 0, coach_onboarded_at: "2026-01-01" }), "completed beginner profile skips onboarding");
const metadata = billing.checkoutMetadata("biz_buyer", "plan_testpro");
check(billing.checkoutCompany(metadata, "plan_testpro") === "biz_buyer", "checkout binding verifies purchasing business");
check(billing.checkoutCompany({ ...metadata, fitz_company_id: "biz_attacker" }, "plan_testpro") === null, "changing checkout business invalidates signature");
check(billing.checkoutCompany(metadata, "plan_other") === null, "checkout binding cannot transfer to another plan");
check(billing.checkoutCompany({}, "plan_testpro") === null, "missing binding fails closed");

const next = { NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200 }) } };
let allowed = true, updates = 0, uploads = 0, removals = 0, failSave = false, calls = 0;
let company = { id: "internal-buyer", whop_company_id: "biz_buyer", plan: "free" };
const auth = { requireCoachAccess: async id => { if (!allowed || id !== "biz_buyer") throw { status: 403 }; return { userId: "user_coach" }; } };
const errors = { apiErrorResponse: error => ({ status: error.status || 500 }) };
const companies = {
  getOrCreateCompany: async () => company,
  updateCompanySettings: async (id, value) => { assert.equal(id, "biz_buyer"); if (failSave) throw new Error("DB unavailable"); updates++; company = { ...company, ...value }; return company; },
};
const storage = { isMockEnv: false, supabaseAdmin: { storage: { from: bucket => {
  assert.equal(bucket, "coach-avatars");
  return { upload: async (path, bytes, options) => { check(path.startsWith("internal-buyer/") && !options.upsert, "photo upload is scoped to authorized workspace without overwrite"); uploads++; return { error: null }; },
    remove: async paths => { check(paths.every(p => p.startsWith("internal-buyer/")), "rollback only removes this workspace's new upload"); removals++; },
    createSignedUrl: async path => ({ data: { signedUrl: `https://example.invalid/${path}?signed=test` }, error: null }) };
} } } };
const avatar = load("lib/services/coach-profile.ts", { "@/lib/supabase/admin": storage });
check((await avatar.withCoachAvatar({ ...company, coach_avatar_path: "foreign/photo.png" })).avatar_url === null, "foreign avatar path is never signed");
const route = load("app/api/coach/profile/route.ts", {
  "node:crypto": crypto, "next/server": next, "@/lib/whop-auth": auth, "@/lib/api-errors": errors,
  "@/lib/services/companies": companies, "@/lib/services/coach-profile": avatar, "@/lib/coach-profile": profile,
  "@/lib/supabase/admin": storage, "@/lib/rate-limiter": { checkRateLimit: () => ({ allowed: true }) },
});
function form(extra = {}) {
  const value = new FormData();
  for (const [key, item] of Object.entries({ coach_name: " Coach Test ", coach_years_experience: "5", coach_expertise: " Strength ", ...extra })) value.set(key, item);
  return value;
}
const req = (data, id = "biz_buyer") => ({ nextUrl: new URL(`http://localhost/?companyId=${id}`), headers: new Headers(), formData: async () => data });
allowed = false;
check((await route.POST(req(form()))).status === 403 && updates === 0 && uploads === 0, "non-admin cannot save profile or upload");
allowed = true;
check((await route.POST(req(form(), "biz_foreign"))).status === 403, "coach cannot modify foreign workspace");
check((await route.POST(req(form({ coach_years_experience: "2e1" })))).status === 400, "non-integer experience encoding rejected");
check((await route.POST(req(form({ photo: new File(["<svg/>"], "a.svg", { type: "image/svg+xml" }) })))).status === 400, "active SVG uploads rejected");
check((await route.POST(req(form({ photo: new File(["not a PNG"], "a.png", { type: "image/png" }) })))).status === 400, "spoofed photo MIME rejected");
check((await route.POST(req(form({ photo: new File([new Uint8Array(2097153)], "a.png", { type: "image/png" }) })))).status === 413, "oversized photo rejected");
const saved = await route.POST(req(form({ plan: "pro", coach_avatar_path: "foreign/photo.png", coach_onboarded_at: "forged" })));
check(saved.status === 200 && company.plan === "free" && company.coach_name === "Coach Test" && company.coach_avatar_path === null && company.coach_onboarded_at !== "forged", "save trims input and ignores injected plan, path and completion date");
const completedAt = company.coach_onboarded_at;
const png = new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=", "base64")], "photo.png", { type: "image/png" });
const photoSaved = await route.POST(req(form({ photo: png })));
check(photoSaved.status === 200 && photoSaved.data.company.avatar_url.includes("signed=test") && company.coach_onboarded_at === completedAt, "photo save returns short-lived URL and retains completion date");
check((await route.POST(req(form({ remove_photo: "true" })))).data.company.coach_avatar_path === null, "coach can remove photo without removing profile");
failSave = true;
check((await route.POST(req(form({ photo: png })))).status === 500 && removals === 1, "failed database save rolls back only the new photo");
failSave = false;

const checkoutRoute = load("app/api/coach/checkout/route.ts", {
  "next/server": next, "@/lib/whop-auth": auth, "@/lib/api-errors": errors,
  "@/lib/billing-checkout": billing, "@/lib/services/companies": companies, "@/lib/supabase/admin": { isMockEnv: false },
  "@/lib/rate-limiter": { checkRateLimit: () => ({ allowed: true }) },
  "@/lib/whop-sdk": { whopsdk: { checkoutConfigurations: { create: async body => { calls++; assert.equal(body.plan_id, "plan_testpro"); assert.equal(body.plan, undefined); assert.equal(billing.checkoutCompany(body.metadata, body.plan_id), "biz_buyer"); return { id: "ch_test" }; } } } },
});
check((await checkoutRoute.POST(req(null))).data.sessionId === "ch_test" && calls === 1, "checkout reuses existing plan with verified workspace binding");
allowed = false;
check((await checkoutRoute.POST(req(null))).status === 403 && calls === 1, "non-admin cannot create checkout");
allowed = true; company.plan = "pro";
check((await checkoutRoute.POST(req(null))).status === 409 && calls === 1, "already-Pro workspace cannot start duplicate purchase");

let planUpdates = [];
const webhook = load("app/api/webhooks/whop/route.ts", {
  "next/server": next, crypto, "@whop/sdk/helpers": { unwrapWebhook: JSON.parse }, "@/lib/billing-checkout": billing,
  "@/lib/supabase/admin": { isMockEnv: false, supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), insert: async () => ({ error: null }) }) } },
  "@/lib/services/companies": companies, "@/lib/services/clients": {}, "@/lib/services/paywall": { updateCompanyPlan: async (id, plan) => planUpdates.push([id, plan]) },
});
const event = (action, meta = metadata) => ({ headers: new Headers(), text: async () => JSON.stringify({ id: crypto.randomUUID(), action, data: { company_id: "biz_seller", plan_id: "plan_testpro", metadata: meta } }) });
check((await webhook.POST(event("payment.succeeded"))).status === 200 && planUpdates[0][0] === "biz_buyer" && planUpdates[0][1] === "pro", "successful payment upgrades buyer workspace, never seller");
check((await webhook.POST(event("payment.failed"))).status === 200 && planUpdates[1][0] === "biz_buyer" && planUpdates[1][1] === "free", "failed payment revokes buyer Pro");
check((await webhook.POST(event("payment.succeeded", {}))).status === 422 && planUpdates.length === 2, "unbound payment cannot grant Pro to seller or arbitrary business");
check((await webhook.POST(event("payment.succeeded", { ...metadata, fitz_company_id: "biz_foreign" }))).status === 422 && planUpdates.length === 2, "tampered payment metadata cannot grant Pro");
console.log(`\n${count} coach/profile/checkout checks passed using isolated doubles, not live payments.`);
