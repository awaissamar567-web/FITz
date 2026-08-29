/**
 * Phase 6 Exit Check Test Suite: In-App Purchase Paywall Verification
 * 1. 3 active clients enroll on Free Tier without paywall
 * 2. 4th client triggers 3-client paywall barrier (402 Payment Required & isCapped)
 * 3. Whop SaaS subscription upgrade webhook flips company to 'pro'
 * 4. Pro Tier unlocks 4th client and allows unlimited plan assignments
 * 5. Downgrade webhook flips company back to 'free'
 */

function createMockJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() / 1000 })).toString("base64url");
  const signature = Buffer.from("mock_signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const BASE_URL = "http://localhost:3000";

async function runPaywallTestSuite() {
  console.log("===============================================================");
  console.log("💳 RUNNING PHASE 6 IN-APP PURCHASE PAYWALL EXIT CHECK TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  const testId = Date.now();
  const coachUserId = `user_coach_paywall_${testId}`;
  const coachCompanyId = `biz_coach_paywall_${testId}`;
  const coachToken = createMockJwt(coachUserId);

  const authCoach = JSON.stringify({
    [coachCompanyId]: { has_access: true, access_level: "admin" },
  });

  // TEST 1: Enroll 3 active clients on Free Tier
  console.log("▶ TEST 1: Enrolling 3 active clients under free-tier coach...");
  try {
    for (let i = 1; i <= 3; i++) {
      const clientUserId = `user_client_paywall_${testId}_${i}`;
      const expId = `exp_paywall_${testId}_${i}`;
      const clientToken = createMockJwt(clientUserId);
      const authClient = JSON.stringify({
        [expId]: { has_access: true, access_level: "customer" },
      });

      // Intake
      await fetch(`${BASE_URL}/api/client/intake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-whop-user-token": clientToken,
          "x-test-auth": authClient,
        },
        body: JSON.stringify({
          experienceId: expId,
          companyId: coachCompanyId,
          goal: `Fitness Goal ${i}`,
        }),
      });
    }

    const res1 = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachCompanyId}`,
      {
        headers: {
          "x-whop-user-token": coachToken,
          "x-test-auth": authCoach,
        },
      }
    );

    const data1 = await res1.json();
    if (res1.status === 200 && data1.clients?.length === 3) {
      console.log("✅ [PASS] 3 active clients enrolled successfully on free tier");
      passed++;
    } else {
      console.error("❌ [FAIL] Failed to enroll 3 clients:", data1);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 1 exception:", err);
    failed++;
  }

  // TEST 2: Enroll 4th client and attempt plan assignment -> Triggers Paywall Barrier
  console.log("\n▶ TEST 2: Enrolling 4th client and attempting plan assignment (Free Tier Cap)...");
  let client6Record = null;
  try {
    const client6UserId = `user_client_paywall_${testId}_4`;
    const expId6 = `exp_paywall_${testId}_4`;
    const client6Token = createMockJwt(client6UserId);
    const authClient6 = JSON.stringify({
      [expId6]: { has_access: true, access_level: "customer" },
    });

    await fetch(`${BASE_URL}/api/client/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": client6Token,
        "x-test-auth": authClient6,
      },
      body: JSON.stringify({
        experienceId: expId6,
        companyId: coachCompanyId,
        goal: "Muscle Hypertrophy",
      }),
    });

    const resRoster = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachCompanyId}`,
      {
        headers: {
          "x-whop-user-token": coachToken,
          "x-test-auth": authCoach,
        },
      }
    );
    const dataRoster = await resRoster.json();
    client6Record = dataRoster.clients?.find((c) => c.whop_user_id === client6UserId);

    // Attempt plan assignment for 4th client while on Free tier
    const resPlan = await fetch(`${BASE_URL}/api/coach/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": coachToken,
        "x-test-auth": authCoach,
      },
      body: JSON.stringify({
        companyId: coachCompanyId,
        clientId: client6Record?.id,
        split_name: "Push/Pull/Legs",
        exercises: [{ name: "Squat", sets: 4, reps: "8-10" }],
        macros: { calories: 2500, protein: 180, carbs: 250, fat: 70 },
      }),
    });

    const dataPlan = await resPlan.json();

    if (resPlan.status === 402 && dataPlan.paywall_required === true && dataRoster.paywallStatus?.isCapped) {
      console.log("✅ [PASS] 4th client strictly triggered Paywall modal/barrier (402 Payment Required)");
      passed++;
    } else {
      console.error("❌ [FAIL] 4th client failed to trigger paywall:", resPlan.status, dataPlan);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 2 exception:", err);
    failed++;
  }

  // TEST 3: Webhook upgrades coach to Pro Tier
  console.log("\n▶ TEST 3: Simulating verified Whop Pro subscription webhook upgrade...");
  try {
    const resUpgrade = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-webhook": "true",
      },
      body: JSON.stringify({
        id: `evt_upgrade_${testId}`,
        action: "membership.activated",
        data: {
          company_id: coachCompanyId,
          user_id: coachUserId,
          is_app_subscription: true,
          plan_id: "plan_fitz_pro",
          package_id: "fitz_pro",
        },
      }),
    });

    const resCheckPro = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachCompanyId}`,
      {
        headers: {
          "x-whop-user-token": coachToken,
          "x-test-auth": authCoach,
        },
      }
    );
    const dataCheckPro = await resCheckPro.json();

    if (resUpgrade.status === 200 && dataCheckPro.paywallStatus?.plan === "pro" && !dataCheckPro.paywallStatus?.isCapped) {
      console.log("✅ [PASS] Whop webhook upgraded coach workspace to 'pro' tier");
      passed++;
    } else {
      console.error("❌ [FAIL] Pro upgrade webhook failed:", dataCheckPro);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 3 exception:", err);
    failed++;
  }

  // TEST 4: Pro Tier unlocks 4th client plan assignment and beyond
  console.log("\n▶ TEST 4: Re-attempting 4th client plan assignment on Pro Tier...");
  try {
    const resPlanUnlocked = await fetch(`${BASE_URL}/api/coach/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": coachToken,
        "x-test-auth": authCoach,
      },
      body: JSON.stringify({
        companyId: coachCompanyId,
        clientId: client6Record?.id,
        split_name: "Push/Pull/Legs",
        exercises: [{ name: "Squat", sets: 4, reps: "8-10" }],
        macros: { calories: 2500, protein: 180, carbs: 250, fat: 70 },
      }),
    });

    const dataPlanUnlocked = await resPlanUnlocked.json();

    // Enroll 7th client to confirm unlimited capacity
    const client7UserId = `user_client_paywall_${testId}_7`;
    const expId7 = `exp_paywall_${testId}_7`;
    const client7Token = createMockJwt(client7UserId);
    const authClient7 = JSON.stringify({
      [expId7]: { has_access: true, access_level: "customer" },
    });

    await fetch(`${BASE_URL}/api/client/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": client7Token,
        "x-test-auth": authClient7,
      },
      body: JSON.stringify({
        experienceId: expId7,
        companyId: coachCompanyId,
        goal: "Endurance",
      }),
    });

    if (resPlanUnlocked.status === 200 && dataPlanUnlocked.success) {
      console.log("✅ [PASS] Pro tier unlocked additional clients with unlimited capacity");
      passed++;
    } else {
      console.error("❌ [FAIL] Plan assignment failed on Pro tier:", resPlanUnlocked.status, dataPlanUnlocked);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 4 exception:", err);
    failed++;
  }

  // TEST 5: Downgrade webhook flips company back to 'free'
  console.log("\n▶ TEST 5: Simulating Whop Pro subscription cancellation webhook...");
  try {
    const resDowngrade = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-webhook": "true",
      },
      body: JSON.stringify({
        id: `evt_cancel_${testId}`,
        action: "membership.deactivated",
        data: {
          company_id: coachCompanyId,
          user_id: coachUserId,
          is_app_subscription: true,
          plan_id: "plan_fitz_pro",
          package_id: "fitz_pro",
        },
      }),
    });

    const resCheckFree = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${coachCompanyId}`,
      {
        headers: {
          "x-whop-user-token": coachToken,
          "x-test-auth": authCoach,
        },
      }
    );
    const dataCheckFree = await resCheckFree.json();

    if (resDowngrade.status === 200 && dataCheckFree.paywallStatus?.plan === "free" && dataCheckFree.paywallStatus?.isCapped) {
      console.log("✅ [PASS] Downgrade webhook flipped company back to 'free' with capped status");
      passed++;
    } else {
      console.error("❌ [FAIL] Downgrade webhook failed:", dataCheckFree);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Test 5 exception:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`PAYWALL TEST SUMMARY: ${passed} Passed, ${failed} Failed out of 5 Tests`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPaywallTestSuite();
