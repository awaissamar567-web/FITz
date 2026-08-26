/**
 * Phase 3 Exit Check Test Suite: Member Onboarding, Check-In, History, and IDOR Prevention
 */

function createMockJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() / 1000 })).toString("base64url");
  const signature = Buffer.from("mock_signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const BASE_URL = "http://localhost:3000";

async function runClientFlowTestSuite() {
  console.log("===============================================================");
  console.log("🏋️ RUNNING PHASE 3 MEMBER FLOW & IDOR EXIT CHECK TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  const clientC_UserId = "user_client_sandbox_C";
  const clientD_UserId = "user_client_sandbox_D";
  const coachCompanyId = "biz_coach_sandbox_alpha";
  const expIdC = "exp_client_sandbox_C";
  const expIdD = "exp_client_sandbox_D";

  const clientCToken = createMockJwt(clientC_UserId);
  const clientDToken = createMockJwt(clientD_UserId);

  const testAuthHeaderC = JSON.stringify({
    [expIdC]: { has_access: true, access_level: "customer" },
  });

  const testAuthHeaderD = JSON.stringify({
    [expIdD]: { has_access: true, access_level: "customer" },
  });

  // TEST 1: Client C completes onboarding/intake
  console.log("▶ TEST 1: Client C completes onboarding & intake form...");
  let clientCRecord = null;
  try {
    const res1 = await fetch(`${BASE_URL}/api/client/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientCToken,
        "x-test-auth": testAuthHeaderC,
      },
      body: JSON.stringify({
        experienceId: expIdC,
        companyId: coachCompanyId,
        goal: "Build lean muscle and drop 10 lbs",
        stats: { height: "5'11", currentWeight: 82.5, targetWeight: 78.0, age: 29 },
        experience_level: "intermediate",
        equipment: { gymAccess: true, daysPerWeek: 4 },
        limitations: "Minor left shoulder tightness",
      }),
    });

    const data1 = await res1.json();
    if (res1.status === 200 && data1.client?.intake_completed === true) {
      console.log("✅ [PASS] Client C onboarding intake completed successfully");
      clientCRecord = data1.client;
      passed++;
    } else {
      console.error("❌ [FAIL] Client C onboarding intake failed:", data1);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 1 exception:", err);
    failed++;
  }

  // TEST 2: Client C submits check-in with weight, macros, and photo
  console.log("\n▶ TEST 2: Client C submits weekly check-in with photo & macros...");
  try {
    const res2 = await fetch(`${BASE_URL}/api/client/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientCToken,
        "x-test-auth": testAuthHeaderC,
      },
      body: JSON.stringify({
        experienceId: expIdC,
        companyId: coachCompanyId,
        weight: 81.8,
        photo_url: "https://storage.fitz.local/checkin-photos/mock_photo_1.jpg",
        macro_hit: { hitTarget: true, calories: 2350, protein: 175 },
        notes: "Great energy all week, hit 4 gym sessions.",
        date: "2026-08-24",
      }),
    });

    const data2 = await res2.json();
    if (res2.status === 201 && data2.checkin?.weight === 81.8) {
      console.log("✅ [PASS] Client C check-in recorded successfully with photo and macro data");
      passed++;
    } else {
      console.error("❌ [FAIL] Client C check-in submission failed:", data2);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 2 exception:", err);
    failed++;
  }

  // TEST 3: Client C views check-in history
  console.log("\n▶ TEST 3: Client C retrieves own check-in history feed...");
  try {
    const res3 = await fetch(
      `${BASE_URL}/api/client/checkin?experienceId=${expIdC}&companyId=${coachCompanyId}`,
      {
        headers: {
          "x-whop-user-token": clientCToken,
          "x-test-auth": testAuthHeaderC,
        },
      }
    );

    const data3 = await res3.json();
    const hasCheckin = data3.checkins?.some((c) => c.weight === 81.8);
    if (res3.status === 200 && hasCheckin) {
      console.log("✅ [PASS] Client C history retrieved and accurately reflects submitted check-in");
      passed++;
    } else {
      console.error("❌ [FAIL] Client C history query failed:", data3);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 3 exception:", err);
    failed++;
  }

  // TEST 4: Client C views today's plan
  console.log("\n▶ TEST 4: Client C retrieves active plan & macros...");
  try {
    const res4 = await fetch(
      `${BASE_URL}/api/client/plan?experienceId=${expIdC}&companyId=${coachCompanyId}`,
      {
        headers: {
          "x-whop-user-token": clientCToken,
          "x-test-auth": testAuthHeaderC,
        },
      }
    );

    const data4 = await res4.json();
    if (res4.status === 200) {
      console.log("✅ [PASS] Client C plan endpoint responded with 200 OK");
      passed++;
    } else {
      console.error("❌ [FAIL] Client C plan endpoint failed:", data4);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 4 exception:", err);
    failed++;
  }

  // TEST 5: Client C attempts to read Client D's data via direct API IDOR
  console.log("\n▶ TEST 5: Client C attempts direct API call to access Client D data (IDOR prevention)...");
  try {
    // Setup Client D first
    await fetch(`${BASE_URL}/api/client/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": clientDToken,
        "x-test-auth": testAuthHeaderD,
      },
      body: JSON.stringify({
        experienceId: expIdD,
        companyId: coachCompanyId,
        goal: "Client D secret goal",
      }),
    });

    // Now Client C tries to request Client D's ID
    const res5 = await fetch(
      `${BASE_URL}/api/client/checkin?experienceId=${expIdC}&companyId=${coachCompanyId}&clientId=mock_uuid_client_d_tamper`,
      {
        headers: {
          "x-whop-user-token": clientCToken,
          "x-test-auth": testAuthHeaderC,
        },
      }
    );

    const data5 = await res5.json();
    if (res5.status === 403 && data5.error?.includes("Forbidden")) {
      console.log("✅ [PASS] Direct IDOR cross-client access was strictly denied with 403 Forbidden");
      passed++;
    } else {
      console.error("❌ [FAIL] IDOR cross-client request was not denied with 403:", data5);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 5 exception:", err);
    failed++;
  }

  // TEST 6: Unauthenticated check-in attempt
  console.log("\n▶ TEST 6: Unauthenticated user submits check-in...");
  try {
    const res6 = await fetch(`${BASE_URL}/api/client/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        experienceId: expIdC,
        weight: 70.0,
      }),
    });

    if (res6.status === 401 || res6.status === 403) {
      console.log("✅ [PASS] Unauthenticated check-in submission was strictly rejected");
      passed++;
    } else {
      console.error("❌ [FAIL] Unauthenticated request was not rejected:", res6.status);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 6 exception:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`CLIENT FLOW TEST SUMMARY: ${passed} Passed, ${failed} Failed out of 6 Tests`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runClientFlowTestSuite();
