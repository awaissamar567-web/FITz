/**
 * Phase 5 Exit Check Test Suite: Churn & Retention Engine Verification
 * Fully HTTP-driven test suite verifying:
 * 1. Client with no check-in after 5+ days flips to 'at_risk'
 * 2. Coach roster returns at-risk client under status filter with amber badge
 * 3. Weekly client with 10+ days since last check-in flips to 'at_risk'
 * 4. At-risk client logging a new check-in automatically recovers to 'active'
 * 5. Cancelled clients preserve 'cancelled' status and are not mutated to 'at_risk'
 */

function createMockJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() / 1000 })).toString("base64url");
  const signature = Buffer.from("mock_signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const BASE_URL = "http://localhost:3000";

async function runRetentionTestSuite() {
  console.log("===============================================================");
  console.log("⚠️ RUNNING PHASE 5 RETENTION & CHURN ENGINE EXIT CHECK TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  const coachA_UserId = "user_coach_sandbox_alpha";
  const coachA_CompanyId = "biz_coach_sandbox_alpha";
  const coachAToken = createMockJwt(coachA_UserId);

  const clientE_UserId = `user_client_retention_E_${Date.now()}`;
  const clientF_UserId = `user_client_retention_F_${Date.now()}`;
  const clientG_UserId = `user_client_retention_G_${Date.now()}`;

  const expIdE = `exp_client_E_${Date.now()}`;
  const expIdF = `exp_client_F_${Date.now()}`;
  const expIdG = `exp_client_G_${Date.now()}`;

  const clientEToken = createMockJwt(clientE_UserId);
  const clientFToken = createMockJwt(clientF_UserId);

  const authCoachA = JSON.stringify({
    [coachA_CompanyId]: { has_access: true, access_level: "admin" },
  });

  const authClientE = JSON.stringify({
    [expIdE]: { has_access: true, access_level: "customer" },
  });

  const authClientF = JSON.stringify({
    [expIdF]: { has_access: true, access_level: "customer" },
  });

  // TEST 1: Create client E (no check-in) -> Evaluate Risk with +6 days asOfDate
  console.log("▶ TEST 1: Creating sandbox client E and evaluating risk (+6 days since join)...");
  try {
    // 1. Intake
    await fetch(`${BASE_URL}/api/client/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientEToken,
        "x-test-auth": authClientE,
      },
      body: JSON.stringify({
        experienceId: expIdE,
        companyId: coachA_CompanyId,
        goal: "Fat loss & tone",
      }),
    });

    // 2. Trigger retention evaluation with +6 days asOfDate
    const sixDaysLater = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    const res1 = await fetch(`${BASE_URL}/api/coach/retention/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": coachAToken,
        "x-test-auth": authCoachA,
      },
      body: JSON.stringify({
        companyId: coachA_CompanyId,
        asOfDate: sixDaysLater,
      }),
    });

    const data1 = await res1.json();

    // 3. Verify client is now at_risk
    const resCheck = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachA_CompanyId}&status=at_risk`,
      {
        headers: {
          "x-whop-user-token": coachAToken,
          "x-test-auth": authCoachA,
        },
      }
    );
    const dataCheck = await resCheck.json();
    const foundE = dataCheck.clients?.find((c) => c.whop_user_id === clientE_UserId);

    if (res1.status === 200 && foundE && foundE.status === "at_risk") {
      console.log("✅ [PASS] Client E (6 days no check-in) evaluated and flipped to 'at_risk'");
      passed++;
    } else {
      console.error("❌ [FAIL] Client E risk evaluation failed:", foundE, data1);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 1 exception:", err);
    failed++;
  }

  // TEST 2: Coach Dashboard Roster Filter reflects at_risk client
  console.log("\n▶ TEST 2: Verifying Coach at-risk roster query...");
  try {
    const res2 = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachA_CompanyId}&status=at_risk`,
      {
        headers: {
          "x-whop-user-token": coachAToken,
          "x-test-auth": authCoachA,
        },
      }
    );

    const data2 = await res2.json();
    const foundAtRisk = data2.clients?.find((c) => c.whop_user_id === clientE_UserId);
    if (res2.status === 200 && foundAtRisk && foundAtRisk.status === "at_risk") {
      console.log("✅ [PASS] Coach roster accurately returns Client E under at-risk filter");
      passed++;
    } else {
      console.error("❌ [FAIL] Coach roster at-risk filter failed:", data2);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 2 exception:", err);
    failed++;
  }

  // TEST 3: Weekly client F with check-in 12 days ago -> Flips to at_risk
  console.log("\n▶ TEST 3: Weekly client F with last check-in 12 days prior to evaluation...");
  try {
    // Intake
    await fetch(`${BASE_URL}/api/client/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientFToken,
        "x-test-auth": authClientF,
      },
      body: JSON.stringify({
        experienceId: expIdF,
        companyId: coachA_CompanyId,
        goal: "Strength",
      }),
    });

    // Checkin on base date
    const baseDateStr = "2026-08-10";
    await fetch(`${BASE_URL}/api/client/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientFToken,
        "x-test-auth": authClientF,
      },
      body: JSON.stringify({
        experienceId: expIdF,
        companyId: coachA_CompanyId,
        weight: 75.0,
        date: baseDateStr,
      }),
    });

    // Run evaluation 12 days later (2026-08-22, threshold is 10 days)
    await fetch(`${BASE_URL}/api/coach/retention/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": coachAToken,
        "x-test-auth": authCoachA,
      },
      body: JSON.stringify({
        companyId: coachA_CompanyId,
        asOfDate: "2026-08-22T00:00:00.000Z",
      }),
    });

    const resF = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachA_CompanyId}&status=at_risk`,
      {
        headers: {
          "x-whop-user-token": coachAToken,
          "x-test-auth": authCoachA,
        },
      }
    );
    const dataF = await resF.json();
    const foundF = dataF.clients?.find((c) => c.whop_user_id === clientF_UserId);

    if (foundF && foundF.status === "at_risk") {
      console.log("✅ [PASS] Client F (12 days since check-in) flipped to 'at_risk'");
      passed++;
    } else {
      console.error("❌ [FAIL] Client F risk evaluation failed:", foundF);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 3 exception:", err);
    failed++;
  }

  // TEST 4: At-risk client E logs a new check-in -> Recovers to active
  console.log("\n▶ TEST 4: At-risk Client E submits check-in -> Recovers to 'active'...");
  try {
    const res4 = await fetch(`${BASE_URL}/api/client/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientEToken,
        "x-test-auth": authClientE,
      },
      body: JSON.stringify({
        experienceId: expIdE,
        companyId: coachA_CompanyId,
        weight: 72.0,
        macro_hit: { hitTarget: true },
        notes: "Back on track!",
        date: new Date().toISOString().split("T")[0],
      }),
    });

    const resCheckActive = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachA_CompanyId}&status=active`,
      {
        headers: {
          "x-whop-user-token": coachAToken,
          "x-test-auth": authCoachA,
        },
      }
    );
    const dataActive = await resCheckActive.json();
    const foundActive = dataActive.clients?.find((c) => c.whop_user_id === clientE_UserId);

    if (res4.status === 201 && foundActive && foundActive.status === "active") {
      console.log("✅ [PASS] Client E automatically recovered from 'at_risk' to 'active'");
      passed++;
    } else {
      console.error("❌ [FAIL] Client E failed to recover to active:", foundActive);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 4 exception:", err);
    failed++;
  }

  // TEST 5: Cancelled client is not flipped to at_risk
  console.log("\n▶ TEST 5: Preserving 'cancelled' status on deactivated member...");
  try {
    // Activate client G
    await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-webhook": "true",
      },
      body: JSON.stringify({
        id: `evt_g_sub_${Date.now()}`,
        action: "membership.activated",
        data: {
          company_id: coachA_CompanyId,
          user_id: clientG_UserId,
          experience_id: expIdG,
        },
      }),
    });

    // Deactivate client G
    await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-webhook": "true",
      },
      body: JSON.stringify({
        id: `evt_g_cancel_${Date.now()}`,
        action: "membership.deactivated",
        data: {
          company_id: coachA_CompanyId,
          user_id: clientG_UserId,
        },
      }),
    });

    // Evaluate retention 30 days in future
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${BASE_URL}/api/coach/retention/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": coachAToken,
        "x-test-auth": authCoachA,
      },
      body: JSON.stringify({
        companyId: coachA_CompanyId,
        asOfDate: futureDate,
      }),
    });

    const resG = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachA_CompanyId}&status=cancelled`,
      {
        headers: {
          "x-whop-user-token": coachAToken,
          "x-test-auth": authCoachA,
        },
      }
    );
    const dataG = await resG.json();
    const foundG = dataG.clients?.find((c) => c.whop_user_id === clientG_UserId);

    if (foundG && foundG.status === "cancelled") {
      console.log("✅ [PASS] Cancelled client preserved as 'cancelled' (not mutated to at_risk)");
      passed++;
    } else {
      console.error("❌ [FAIL] Cancelled client status was mutated:", foundG);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 5 exception:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`RETENTION TEST SUMMARY: ${passed} Passed, ${failed} Failed out of 5 Tests`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRetentionTestSuite();
