/**
 * Phase 4 Exit Check Test Suite: Coach Dashboard, Plan Assignment, Feed, and Isolation
 */

function createMockJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() / 1000 })).toString("base64url");
  const signature = Buffer.from("mock_signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const BASE_URL = "http://localhost:3000";

async function runCoachFlowTestSuite() {
  console.log("===============================================================");
  console.log("📊 RUNNING PHASE 4 COACH WORKSPACE & FEED EXIT CHECK TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  const coachA_UserId = "user_coach_sandbox_alpha";
  const coachB_UserId = "user_coach_sandbox_beta";
  const clientC_UserId = "user_client_sandbox_C";

  const coachA_CompanyId = "biz_coach_sandbox_alpha";
  const coachB_CompanyId = "biz_coach_sandbox_beta";
  const expIdC = "exp_client_sandbox_C";

  const coachAToken = createMockJwt(coachA_UserId);
  const coachBToken = createMockJwt(coachB_UserId);
  const clientCToken = createMockJwt(clientC_UserId);

  const authCoachA = JSON.stringify({
    [coachA_CompanyId]: { has_access: true, access_level: "admin" },
  });

  const authCoachB = JSON.stringify({
    [coachB_CompanyId]: { has_access: true, access_level: "admin" },
  });

  const authClientC = JSON.stringify({
    [expIdC]: { has_access: true, access_level: "customer" },
  });

  // Step 0: Upgrade Coach A to Pro and enroll Client C
  await fetch(`${BASE_URL}/api/webhooks/whop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-test-webhook": "true",
    },
    body: JSON.stringify({
      id: `evt_coach_flow_pro_${Date.now()}`,
      action: "membership.activated",
      data: {
        company_id: coachA_CompanyId,
        user_id: coachA_UserId,
        is_app_subscription: true,
        plan_id: "plan_fitz_pro",
        package_id: "fitz_pro",
      },
    }),
  });

  const intakeRes = await fetch(`${BASE_URL}/api/client/intake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-whop-user-token": clientCToken,
      "x-test-auth": authClientC,
    },
    body: JSON.stringify({
      experienceId: expIdC,
      companyId: coachA_CompanyId,
      goal: "Hypertrophy & Strength",
      stats: { currentWeight: 80.5, targetWeight: 76.0 },
    }),
  });
  const intakeJson = await intakeRes.json();
  if (intakeRes.status !== 200) {
    console.warn("Intake Step 0 Result:", intakeRes.status, intakeJson);
  }

  // TEST 1: Coach A retrieves client roster
  console.log("▶ TEST 1: Coach A loads client roster via API...");
  let clientC_Record = null;
  try {
    const res1 = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachA_CompanyId}`,
      {
        headers: {
          "x-whop-user-token": coachAToken,
          "x-test-auth": authCoachA,
        },
      }
    );

    const data1 = await res1.json();
    const found = data1.clients?.find((c) => c.whop_user_id === clientC_UserId);
    if (res1.status === 200 && found) {
      console.log("✅ [PASS] Coach A successfully loaded client roster with Client C");
      clientC_Record = found;
      passed++;
    } else {
      console.error("❌ [FAIL] Coach A failed to load client roster:", data1);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 1 exception:", err);
    failed++;
  }

  // TEST 2: Coach A assigns workout routine and macros to Client C
  console.log("\n▶ TEST 2: Coach A assigns workout split & macro targets to Client C...");
  try {
    const res2 = await fetch(`${BASE_URL}/api/coach/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": coachAToken,
        "x-test-auth": authCoachA,
      },
      body: JSON.stringify({
        companyId: coachA_CompanyId,
        clientId: clientC_Record?.id,
        split_name: "Upper / Lower Power Split",
        exercises: [
          { name: "Incline Barbell Bench", sets: "4", reps: "6-8", notes: "Heavy compound" },
          { name: "Barbell Rows", sets: "4", reps: "8-10", notes: "Strict form" },
          { name: "Overhead DB Press", sets: "3", reps: "10", notes: "Full lock" },
        ],
        macros: {
          calories: 2400,
          protein: 185,
          carbs: 240,
          fat: 70,
        },
      }),
    });

    const data2 = await res2.json();
    if (res2.status === 200 && data2.plan?.split_name === "Upper / Lower Power Split") {
      console.log("✅ [PASS] Plan assigned and recorded successfully");
      passed++;
    } else {
      console.error("❌ [FAIL] Plan assignment failed:", data2);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 2 exception:", err);
    failed++;
  }

  // TEST 3: Client C verifies assigned plan appears on "Today" view
  console.log("\n▶ TEST 3: Client C verifies assigned plan appears on 'Today' portal...");
  try {
    const res3 = await fetch(
      `${BASE_URL}/api/client/plan?experienceId=${expIdC}&companyId=${coachA_CompanyId}`,
      {
        headers: {
          "x-whop-user-token": clientCToken,
          "x-test-auth": authClientC,
        },
      }
    );

    const data3 = await res3.json();
    const plan = data3.plan;
    if (
      res3.status === 200 &&
      plan?.split_name === "Upper / Lower Power Split" &&
      plan?.macros?.calories === 2400 &&
      plan?.macros?.protein === 185
    ) {
      console.log("✅ [PASS] Client C 'Today' view reflects coach-assigned plan and macro targets");
      passed++;
    } else {
      console.error("❌ [FAIL] Client C 'Today' plan does not match assigned values:", data3);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 3 exception:", err);
    failed++;
  }

  // TEST 4: Client C submits check-in -> Coach A feed receives it immediately
  console.log("\n▶ TEST 4: Client C logs check-in; verifying appearance in Coach A live feed...");
  try {
    // Client logs checkin
    await fetch(`${BASE_URL}/api/client/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientCToken,
        "x-test-auth": authClientC,
      },
      body: JSON.stringify({
        experienceId: expIdC,
        companyId: coachA_CompanyId,
        weight: 79.9,
        macro_hit: { hitTarget: true, calories: 2400, protein: 185 },
        notes: "Hit all lifts on Upper Day!",
        date: "2026-08-24",
      }),
    });

    // Coach A checks feed
    const res4 = await fetch(
      `${BASE_URL}/api/coach/feed?companyId=${coachA_CompanyId}`,
      {
        headers: {
          "x-whop-user-token": coachAToken,
          "x-test-auth": authCoachA,
        },
      }
    );

    const data4 = await res4.json();
    const found = data4.feed?.find((item) => item.weight === 79.9 && item.notes === "Hit all lifts on Upper Day!");
    if (res4.status === 200 && found) {
      console.log("✅ [PASS] Client check-in appeared instantly in Coach A activity feed");
      passed++;
    } else {
      console.error("❌ [FAIL] Check-in missing from Coach A feed:", data4);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 4 exception:", err);
    failed++;
  }

  // TEST 5: Coach B attempts cross-tenant write (Assigning plan to Coach A's client)
  console.log("\n▶ TEST 5: Coach B attempts to assign plan to Coach A's client (Cross-Tenant write blocking)...");
  try {
    const res5 = await fetch(`${BASE_URL}/api/coach/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": coachBToken,
        "x-test-auth": authCoachB,
      },
      body: JSON.stringify({
        companyId: coachB_CompanyId, // Coach B's company
        clientId: clientC_Record?.id, // But Coach A's client
        split_name: "Malicious Tampered Split",
      }),
    });

    const data5 = await res5.json();
    if (res5.status === 404 || res5.status === 403) {
      console.log("✅ [PASS] Cross-tenant plan assignment strictly rejected");
      passed++;
    } else {
      console.error("❌ [FAIL] Cross-tenant plan assignment was not rejected:", data5);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 5 exception:", err);
    failed++;
  }

  // TEST 6: Coach B attempts cross-tenant read (Reading Coach A's activity feed)
  console.log("\n▶ TEST 6: Coach B attempts to read Coach A's live activity feed...");
  try {
    const res6 = await fetch(
      `${BASE_URL}/api/coach/feed?companyId=${coachA_CompanyId}`,
      {
        headers: {
          "x-whop-user-token": coachBToken,
          "x-test-auth": authCoachB,
        },
      }
    );

    const data6 = await res6.json();
    if (res6.status === 403 && data6.error?.includes("Forbidden")) {
      console.log("✅ [PASS] Cross-tenant activity feed access strictly blocked with 403 Forbidden");
      passed++;
    } else {
      console.error("❌ [FAIL] Cross-tenant feed access was not blocked with 403:", data6);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 6 exception:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`COACH FLOW TEST SUMMARY: ${passed} Passed, ${failed} Failed out of 6 Tests`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runCoachFlowTestSuite();
