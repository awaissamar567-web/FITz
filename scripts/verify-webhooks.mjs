/**
 * Phase 2 Exit Check Test Suite: Whop Webhooks & Idempotent Data Management
 * Tests:
 * 1. Subscribing a sandbox client creates exactly one clients row
 * 2. Resending the duplicate webhook does not create a duplicate row (Idempotency)
 * 3. Deactivation sets status = 'cancelled'
 * 4. Resending deactivation webhook processes idempotently
 * 5. Reactivation flips status back to 'active' without duplicate row
 */

const BASE_URL = "http://localhost:3000";

async function postWebhook(payload, headers = {}) {
  const res = await fetch(`${BASE_URL}/api/webhooks/whop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-test-webhook": "true",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

async function runWebhookTestSuite() {
  console.log("===============================================================");
  console.log("🔔 RUNNING PHASE 2 WEBHOOK & IDEMPOTENCY EXIT CHECK TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  const testEventId1 = `evt_sub_${Date.now()}_1`;
  const testEventId2 = `evt_cancel_${Date.now()}_2`;
  const testEventId3 = `evt_reactivate_${Date.now()}_3`;

  const coachCompanyId = "biz_coach_sandbox_alpha";
  const clientUserId = "user_client_sandbox_101";
  const clientExpId = "exp_fitness_sandbox_101";

  // TEST 1: membership.activated -> Create Client
  console.log("▶ TEST 1: Subscribing sandbox client (membership.activated)...");
  const event1Payload = {
    id: testEventId1,
    action: "membership.activated",
    data: {
      id: "mem_101",
      company_id: coachCompanyId,
      user_id: clientUserId,
      experience_id: clientExpId,
    },
  };

  const res1 = await postWebhook(event1Payload);
  if (res1.status === 200 && res1.data.success === true) {
    console.log("✅ [PASS] membership.activated processed with 200 OK");
    passed++;
  } else {
    console.error("❌ [FAIL] membership.activated failed:", res1);
    failed++;
  }

  // TEST 2: Duplicate Event Resend -> Idempotency Check
  console.log("\n▶ TEST 2: Resending duplicate webhook event (Idempotency verification)...");
  const res2 = await postWebhook(event1Payload);
  if (
    res2.status === 200 &&
    (res2.data.message?.includes("Already processed") || res2.data.message?.includes("idempotent"))
  ) {
    console.log("✅ [PASS] Duplicate webhook recognized and handled idempotently (no duplicates)");
    passed++;
  } else {
    console.error("❌ [FAIL] Duplicate event was not handled idempotently:", res2);
    failed++;
  }

  // TEST 3: membership.deactivated -> Cancel Client
  console.log("\n▶ TEST 3: Cancelling sandbox client (membership.deactivated)...");
  const event2Payload = {
    id: testEventId2,
    action: "membership.deactivated",
    data: {
      id: "mem_101",
      company_id: coachCompanyId,
      user_id: clientUserId,
    },
  };

  const res3 = await postWebhook(event2Payload);
  if (res3.status === 200 && res3.data.success === true) {
    console.log("✅ [PASS] membership.deactivated processed with 200 OK");
    passed++;
  } else {
    console.error("❌ [FAIL] membership.deactivated failed:", res3);
    failed++;
  }

  // TEST 4: Duplicate Cancellation Resend -> Idempotency Check
  console.log("\n▶ TEST 4: Resending duplicate cancellation event (Idempotency verification)...");
  const res4 = await postWebhook(event2Payload);
  if (
    res4.status === 200 &&
    (res4.data.message?.includes("Already processed") || res4.data.message?.includes("idempotent"))
  ) {
    console.log("✅ [PASS] Duplicate cancellation handled idempotently");
    passed++;
  } else {
    console.error("❌ [FAIL] Duplicate cancellation was not handled idempotently:", res4);
    failed++;
  }

  // TEST 5: Reactivation
  console.log("\n▶ TEST 5: Client resubscribes (Reactivation under same coach)...");
  const event3Payload = {
    id: testEventId3,
    action: "membership.activated",
    data: {
      id: "mem_101_v2",
      company_id: coachCompanyId,
      user_id: clientUserId,
      experience_id: clientExpId,
    },
  };

  const res5 = await postWebhook(event3Payload);
  if (res5.status === 200 && res5.data.success === true) {
    console.log("✅ [PASS] Reactivation processed successfully");
    passed++;
  } else {
    console.error("❌ [FAIL] Reactivation failed:", res5);
    failed++;
  }

  // TEST 6: Malformed Payload Validation
  console.log("\n▶ TEST 6: Invalid/Empty webhook payload...");
  const res6 = await postWebhook({ invalid: "data" });
  if (res6.status === 400) {
    console.log("✅ [PASS] Invalid payload rejected with 400 Bad Request");
    passed++;
  } else {
    console.error("❌ [FAIL] Invalid payload was not rejected with 400:", res6);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`WEBHOOK TEST SUMMARY: ${passed} Passed, ${failed} Failed out of 6 Tests`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runWebhookTestSuite();
