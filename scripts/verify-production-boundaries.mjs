import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as crypto from "node:crypto";

// Execute actual modules with production flags and isolated dependency doubles.
// No credentials, network, database writes, or live Whop payments are used.
function moduleUnderTest(path, dependencies, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, Buffer, URL, console,
    process: { env: { NODE_ENV: "production", FITZ_DEMO_MODE: "true", ...env } },
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: path });
  return module.exports;
}
let passed = 0;
function check(condition, label) { assert.ok(condition, label); passed++; console.log(`PASS ${label}`); }
async function rejects(fn, status, label) {
  await assert.rejects(fn, e => e.status === status); passed++; console.log(`PASS ${label}`);
}
let requestHeaders = new Headers({ "x-dev-user-id": "user_coach_fake", "x-demo-user": "true", referer: "https://example.com/?demo=true" });
let access = { has_access: true, access_level: "admin" };
let verified = 0;
const auth = moduleUnderTest("lib/whop-auth.ts", {
  "next/headers": { headers: async () => requestHeaders },
  "@/lib/whop-sdk": { whopsdk: { users: { checkAccess: async () => access } } },
  "@/lib/whop-app-sdk": { whopAppSdk: { verifyUserToken: async token => {
    verified++; if (token !== "signed-test-token") throw new Error("Invalid token");
    return { userId: "user_verified" };
  } } },
});
check(auth.isDemoRuntime() === false, "production ignores FITZ_DEMO_MODE=true");
await rejects(() => auth.requireCoachAccess("biz_actual", true), 401, "production refuses demo headers, demo referrer and allowDemo");
requestHeaders = new Headers({ "x-whop-user-token": "invalid", "x-test-auth": JSON.stringify({ biz_actual: access }) });
await rejects(() => auth.requireCoachAccess("biz_actual"), 401, "test permissions cannot bypass invalid signed identity");
requestHeaders = new Headers({ "x-whop-user-token": "signed-test-token" });
check((await auth.requireCoachAccess("biz_actual")).userId === "user_verified" && verified === 2, "coach identity passes the token verifier");
access = { has_access: false, access_level: "admin" };
await rejects(() => auth.requireCoachAccess("biz_actual"), 403, "revoked administrator cannot enter coach dashboard");
access = { has_access: true, access_level: "customer" };
await rejects(() => auth.requireCoachAccess("biz_actual"), 403, "active member cannot enter coach dashboard");
check((await auth.requireClientAccess("exp_actual")).accessLevel === "customer", "active member may enter member experience");
access = { has_access: false, access_level: "no_access" };
await rejects(() => auth.requireClientAccess("exp_actual"), 403, "inactive member access fails closed");

const tenant = { id: "company-internal", whop_company_id: "biz_actual", plan: "free" };
let reads = 0;
let provisions = 0;
let resolvedTenant;
const context = moduleUnderTest("lib/member-context.ts", {
  "@/lib/whop-auth": { WhopAuthError: auth.WhopAuthError, isDemoRuntime: () => false, requireClientAccess: async () => ({ userId: "user_verified" }) },
  "@/lib/whop-sdk": { whopsdk: { experiences: { retrieve: async ({ id }) => {
    assert.equal(id, "exp_actual"); return { company: { id: "biz_actual" } };
  } } } },
  "@/lib/supabase/admin": { isMockEnv: false },
  "@/lib/services/companies": { getOrCreateCompany: async id => { resolvedTenant = id; return tenant; } },
  "@/lib/services/clients": {
    getClientByWhopUserId: async (id, user) => { reads++; assert.equal(id, tenant.id); assert.equal(user, "user_verified"); return null; },
    createOrReactivateClient: async (id, user) => { provisions++; return { id: "client-actual", company_id: id, whop_user_id: user }; },
  },
});
await rejects(() => context.memberContext("exp_actual", "biz_attacker"), 403, "request cannot replace experience tenant with another company");
check(reads === 0 && provisions === 0 && resolvedTenant === "biz_actual", "tenant mismatch rejected before member read or creation");
check((await context.memberContext("exp_actual", tenant.id)).client.company_id === tenant.id, "internal company hint accepted only for resolved tenant");
check((await context.memberContext("exp_actual", "biz_actual")).auth.userId === "user_verified", "Whop company hint matches verified experience");
await rejects(() => context.memberContext("biz_actual", "biz_actual"), 403, "company ID cannot substitute for an experience ID");

const constants = moduleUnderTest("lib/constants/plans.ts", {});
const policy = moduleUnderTest("lib/entitlements.ts", { "@/lib/constants/plans": constants });
const clients = Array.from({ length: 260 }, (_, i) => ({ id: String(i), company_id: tenant.id, status: "active", joined_at: `2026-01-01T00:00:00.000Z` }));
const malformed = { ...tenant, free_client_ids: clients.map(c => c.id), pro_client_ids: clients.map(c => c.id) };
check(policy.coachingSlots(malformed, clients).activeCount === 3, "oversized stored Free selection is bounded at runtime");
check(policy.coachingSlots({ ...malformed, plan: "pro" }, clients).activeCount === 250, "oversized stored Pro selection is bounded at runtime");
check(policy.coachingSlots({ ...tenant, free_client_ids: [] }, clients).activeCount === 0, "explicit empty selection never auto-fills");
check(policy.coachingSlots({ ...tenant, free_client_ids: ["0", "0", "foreign"] }, clients).activeCount === 1, "duplicate and foreign saved slots cannot grant access");
clients[0].status = "cancelled";
check(policy.coachingSlots({ ...tenant, free_client_ids: ["0"] }, clients).activeCount === 0, "cancelled member loses selected coaching access");

const payment = moduleUnderTest("lib/services/paywall.ts", {
  "@/lib/supabase/admin": { isMockEnv: false, supabaseAdmin: { from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error("database unavailable") }) }) }) }) }) } },
  "@/lib/services/clients": {}, "@/lib/entitlements": policy,
});
await assert.rejects(() => payment.updateCompanyPlan("biz_actual", "pro"), /database unavailable/);
check(true, "production subscription database failure cannot report success via mock fallback");
let updates = 0;
let recorded = false;
const billing = moduleUnderTest("lib/billing-checkout.ts", { "node:crypto": crypto }, { WHOP_WEBHOOK_SECRET: "mock-test-secret" });
const webhook = moduleUnderTest("app/api/webhooks/whop/route.ts", {
  "next/server": { NextResponse: { json: (data, options) => ({ data, status: options.status }) } },
  crypto: {},
  "@/lib/billing-checkout": billing,
  "@whop/sdk/helpers": { unwrapWebhook: body => JSON.parse(body) },
  "@/lib/supabase/admin": { isMockEnv: false, supabaseAdmin: { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: recorded ? { id: "event" } : null, error: null }) }) }),
    insert: async () => { recorded = true; return { error: null }; },
  }) } },
  "@/lib/services/companies": { getOrCreateCompany: async () => tenant },
  "@/lib/services/clients": {},
  "@/lib/services/paywall": { updateCompanyPlan: async () => { if (++updates === 1) throw new Error("Simulated transient write failure"); return tenant; } },
}, { WHOP_WEBHOOK_SECRET: "mock-test-secret", WHOP_PRO_PLAN_ID: "plan_fitz_pro" });
// Only request parsing is doubled here; unsigned HTTP webhook rejection is covered
// by verify-entitlements.mjs. This isolates retry/idempotency after a write failure.
const webhookReq = { text: async () => JSON.stringify({ id: "evt_retry", action: "payment.failed", data: { company_id: "biz_seller", plan_id: "plan_fitz_pro", metadata: billing.checkoutMetadata("biz_actual", "plan_fitz_pro") } }), headers: new Headers() };
check((await webhook.POST(webhookReq)).status === 500 && !recorded, "failed subscription write remains unacknowledged for retry");
check((await webhook.POST(webhookReq)).status === 200 && updates === 2 && recorded, "same webhook retries its failed write successfully");
check((await webhook.POST(webhookReq)).status === 200 && updates === 2, "successfully applied duplicate webhook does not repeat subscription write");
console.log(`\n${passed} production-boundary checks passed (dependency doubles, not live Whop authentication).`);
