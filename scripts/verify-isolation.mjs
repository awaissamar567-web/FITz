/**
 * Phase 1 Mandatory Exit Check Test Suite: Multi-Tenant Cross-Account Isolation
 * Tests two distinct coach accounts (Coach A and Coach B) and member accounts to
 * prove that URL tampering and cross-tenant access are structurally denied.
 */

function createMockJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() / 1000 })).toString("base64url");
  const signature = Buffer.from("mock_signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const testCases = [
  {
    name: "1. Coach A accesses Coach A Dashboard (Legitimate)",
    url: "http://localhost:3000/dashboard/biz_coach_A",
    userId: "user_coach_A",
    permissions: {
      biz_coach_A: { has_access: true, access_level: "admin" },
    },
    expectedStatus: "ALLOWED",
    expectedText: "Coach Dashboard",
    forbiddenText: "Admin Access Required",
  },
  {
    name: "2. Coach A attempts to load Coach B Dashboard (URL Tampering)",
    url: "http://localhost:3000/dashboard/biz_coach_B",
    userId: "user_coach_A",
    permissions: {
      biz_coach_A: { has_access: true, access_level: "admin" },
    },
    expectedStatus: "DENIED",
    expectedText: "Admin Access Required",
    forbiddenText: "Verified Coach",
  },
  {
    name: "3. Coach B accesses Coach B Dashboard (Legitimate)",
    url: "http://localhost:3000/dashboard/biz_coach_B",
    userId: "user_coach_B",
    permissions: {
      biz_coach_B: { has_access: true, access_level: "admin" },
    },
    expectedStatus: "ALLOWED",
    expectedText: "Coach Dashboard",
    forbiddenText: "Admin Access Required",
  },
  {
    name: "4. Coach B attempts to load Coach A Dashboard (URL Tampering)",
    url: "http://localhost:3000/dashboard/biz_coach_A",
    userId: "user_coach_B",
    permissions: {
      biz_coach_B: { has_access: true, access_level: "admin" },
    },
    expectedStatus: "DENIED",
    expectedText: "Admin Access Required",
    forbiddenText: "Verified Coach",
  },
  {
    name: "5. Client C attempts to access Coach A Dashboard (Privilege Escalation)",
    url: "http://localhost:3000/dashboard/biz_coach_A",
    userId: "user_client_C",
    permissions: {
      exp_client_C: { has_access: true, access_level: "customer" },
    },
    expectedStatus: "DENIED",
    expectedText: "Admin Access Required",
    forbiddenText: "Verified Coach",
  },
  {
    name: "6. Client C accesses their own Experience Portal (Legitimate)",
    url: "http://localhost:3000/experiences/exp_client_C",
    userId: "user_client_C",
    permissions: {
      exp_client_C: { has_access: true, access_level: "customer" },
    },
    expectedStatus: "ALLOWED",
    expectedText: "Fitz",
    forbiddenText: "Membership Required",
  },
  {
    name: "7. Client C attempts to access Client D Experience Portal (Cross-Member IDOR)",
    url: "http://localhost:3000/experiences/exp_client_D",
    userId: "user_client_C",
    permissions: {
      exp_client_C: { has_access: true, access_level: "customer" },
    },
    expectedStatus: "DENIED",
    expectedText: "Membership Required",
    forbiddenText: "Active Member",
  },
  {
    name: "8. Unauthenticated User loads Coach Dashboard (No Token)",
    url: "http://localhost:3000/dashboard/biz_coach_A",
    expectedStatus: "DENIED",
    expectedText: "Admin Access Required",
    forbiddenText: "Verified Coach",
  },
  {
    name: "9. Malformed / Forged Token loads Experience Portal",
    url: "http://localhost:3000/experiences/exp_client_C",
    rawToken: "invalid_malformed_token_string",
    expectedStatus: "DENIED",
    expectedText: "Membership Required",
    forbiddenText: "Active Member",
  },
];

async function runIsolationTestSuite() {
  console.log("===============================================================");
  console.log("🔒 RUNNING PHASE 1 MULTI-TENANT ISOLATION EXIT CHECK TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const headers = {};

    if (tc.rawToken) {
      headers["x-whop-user-token"] = tc.rawToken;
    } else if (tc.userId) {
      headers["x-whop-user-token"] = createMockJwt(tc.userId);
    }

    if (tc.permissions) {
      headers["x-test-auth"] = JSON.stringify(tc.permissions);
    }

    try {
      const res = await fetch(tc.url, { headers });
      const body = await res.text();

      const hasExpected = body.includes(tc.expectedText);
      const hasForbidden = body.includes(tc.forbiddenText);

      if (hasExpected && !hasForbidden) {
        console.log(`✅ [PASS] ${tc.name}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${tc.name}`);
        console.error(`   - Expected text present: ${hasExpected} ("${tc.expectedText}")`);
        console.error(`   - Forbidden text absent: ${!hasForbidden} ("${tc.forbiddenText}")`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${tc.name}:`, err);
      failed++;
    }
  }

  console.log("\n===============================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed out of ${testCases.length} Tests`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runIsolationTestSuite();
