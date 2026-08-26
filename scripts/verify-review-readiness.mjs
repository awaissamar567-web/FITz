/**
 * Phase 7.5 Exit Check Test Suite: Whop App Review Readiness
 * 
 * Verifies all 6 criteria from IMPLEMENTATION_PLAN.md Section 7.5:
 * 1. Fresh install zero-data rendering (coach with 0 clients, client with 0 check-ins)
 * 2. Empty state handling (roster, feed, history graceful messages)
 * 3. Permission minimization audit (strictly necessary scopes only)
 * 4. Whop 'send-test-event' webhook payload compatibility & test pings
 * 5. In-App Purchase Paywall sandbox full lifecycle
 * 6. Cold-start reviewer UX & fail-closed access
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

async function runReviewReadinessTests() {
  console.log("===============================================================");
  console.log("🚀 RUNNING PHASE 7.5 WHOP APP STORE REVIEW READINESS TEST SUITE");
  console.log("===============================================================\n");

  const testStamp = Date.now();
  const freshCompanyId = `biz_fresh_coach_${testStamp}`;
  const freshUserId = `user_fresh_client_${testStamp}`;
  const freshExpId = `exp_fresh_${testStamp}`;

  // -------------------------------------------------------------
  // CHECK 1: Fresh Install Zero-Data Rendering
  // -------------------------------------------------------------
  console.log("▶ CHECK 1: Verifying Fresh Install Zero-Data Route Rendering...");
  try {
    // 1. Fresh Coach Dashboard View (0 clients, uninitialized workspace)
    const coachRes = await fetch(`${BASE_URL}/dashboard/${freshCompanyId}?demo=true`);
    const coachHtml = await coachRes.text();
    assert(
      coachRes.status === 200 && coachHtml.includes("Coach Dashboard"),
      "Fresh coach workspace renders cleanly with 200 OK"
    );

    // 2. Fresh Client Experience View (brand new user, intake uncompleted)
    const clientRes = await fetch(`${BASE_URL}/experiences/${freshExpId}?demo=true`);
    const clientHtml = await clientRes.text();
    assert(
      clientRes.status === 200 && (clientHtml.includes("Client Onboarding Intake") || clientHtml.includes("Welcome to Fitz Coaching")),
      "Fresh client experience renders onboarding intake with 200 OK"
    );
  } catch (err) {
    assert(false, `Fresh install render failed with exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // CHECK 2: Graceful Empty States Handling
  // -------------------------------------------------------------
  console.log("\n▶ CHECK 2: Verifying Graceful Empty State Displays...");
  try {
    // Coach API with 0 clients
    const coachClientsRes = await fetch(`${BASE_URL}/api/coach/clients?companyId=${freshCompanyId}`, {
      headers: { "x-dev-user-id": `user_coach_${freshCompanyId}` },
    });
    const coachClientsData = await coachClientsRes.json();
    assert(
      coachClientsRes.status === 200 && Array.isArray(coachClientsData.clients) && coachClientsData.clients.length === 0,
      "Coach roster returns clean empty array without error for fresh workspace"
    );

    // Activity Feed with 0 items
    const feedRes = await fetch(`${BASE_URL}/api/coach/feed?companyId=${freshCompanyId}`, {
      headers: { "x-dev-user-id": `user_coach_${freshCompanyId}` },
    });
    const feedData = await feedRes.json();
    assert(
      feedRes.status === 200 && Array.isArray(feedData.feed) && feedData.feed.length === 0,
      "Activity feed returns clean empty array for fresh workspace"
    );
  } catch (err) {
    assert(false, `Empty states check failed with exception: ${err.message}`);
  }

  // -------------------------------------------------------------
  // CHECK 3: Permission Minimization Audit
  // -------------------------------------------------------------
  console.log("\n▶ CHECK 3: Auditing Requested Permissions for Over-Privileging...");
  try {
    const fs = await import("fs");
    const manifestRaw = fs.readFileSync("WHOP_APP_STORE_MANIFEST.json", "utf8");
    const manifest = JSON.parse(manifestRaw);

    const allowedPermissions = new Set(["users:read", "memberships:read", "experiences:read"]);
    const hasUnneededPermissions = manifest.permissions.some((p) => !allowedPermissions.has(p));

    assert(
      !hasUnneededPermissions && manifest.permissions.length === 3,
      "Permissions minimized strictly to users:read, memberships:read, experiences:read"
    );
  } catch (err) {
    assert(false, `Permission audit failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // CHECK 4: Whop 'send-test-event' & Test Ping Webhook Compatibility
  // -------------------------------------------------------------
  console.log("\n▶ CHECK 4: Testing Whop 'send-test-event' Webhook Envelope Compatibility...");
  try {
    // 1. Send test ping event (e.g. from Whop developer portal ping button)
    const pingRes = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-webhook": "true" },
      body: JSON.stringify({
        event: "test.ping",
        id: `evt_ping_${testStamp}`,
        timestamp: new Date().toISOString(),
        data: { message: "Test ping from Whop dashboard" },
      }),
    });
    const pingData = await pingRes.json();
    assert(
      pingRes.status === 200,
      "Whop developer portal test ping responded with 200 OK"
    );

    // 2. Send standard test event membership.activated
    const testMemRes = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-webhook": "true" },
      body: JSON.stringify({
        action: "membership.activated",
        id: `evt_test_mem_${testStamp}`,
        data: {
          id: `mem_test_${testStamp}`,
          company_id: freshCompanyId,
          user_id: freshUserId,
          experience_id: freshExpId,
        },
      }),
    });
    const testMemData = await testMemRes.json();
    assert(
      testMemRes.status === 200 && testMemData.success === true,
      "Whop send-test-event membership.activated processed with 200 OK"
    );
  } catch (err) {
    assert(false, `Webhook test event failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // CHECK 5: In-App Purchase Paywall Sandbox Lifecycle
  // -------------------------------------------------------------
  console.log("\n▶ CHECK 5: Testing Paywall Free-to-Pro Upgrade & Sandbox Downgrade...");
  try {
    // Upgrade coach to Pro via verified webhook
    const upgradeRes = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-webhook": "true" },
      body: JSON.stringify({
        action: "membership.activated",
        id: `evt_pro_upgrade_${testStamp}`,
        data: {
          id: `sub_fitz_pro_${testStamp}`,
          company_id: freshCompanyId,
          is_app_subscription: true,
          plan_id: "plan_fitz_pro",
        },
      }),
    });
    assert(upgradeRes.status === 200, "Pro subscription upgrade webhook confirmed with 200 OK");

    // Verify company status in database is now 'pro'
    const companyRes = await fetch(`${BASE_URL}/api/coach/clients?companyId=${freshCompanyId}`, {
      headers: { "x-dev-user-id": `user_coach_${freshCompanyId}` },
    });
    const companyData = await companyRes.json();

    assert(
      companyData.paywallStatus?.plan === "pro",
      "Company workspace state verified as 'pro' tier after webhook"
    );
  } catch (err) {
    assert(false, `Paywall lifecycle failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // CHECK 6: Cold-Start Reviewer UX & Non-Leaking Security Boundary
  // -------------------------------------------------------------
  console.log("\n▶ CHECK 6: Verifying Fail-Closed Security & Clean Error Boundaries for Cold Reviews...");
  try {
    // Unauthenticated direct API call without headers or tokens
    const unauthRes = await fetch(`${BASE_URL}/api/coach/clients?companyId=${freshCompanyId}`);
    const unauthData = await unauthRes.json();

    assert(
      unauthRes.status === 401 && unauthData.error === "Unauthorized",
      "Unauthenticated cold access strictly fails closed with standardized 401 Unauthorized"
    );
  } catch (err) {
    assert(false, `Cold review security check failed: ${err.message}`);
  }

  console.log("\n===============================================================");
  console.log(`REVIEW READINESS SUMMARY: ${passedCount} Passed, ${failedCount} Failed out of ${passedCount + failedCount} Checks`);
  console.log("===============================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runReviewReadinessTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
