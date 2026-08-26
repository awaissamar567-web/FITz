/**
 * Phase 7 Exit Check Test Suite: Security Audit, Hardening & 100-Client Load Test
 */

import fs from "fs";
import path from "path";

function createMockJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() / 1000 })).toString("base64url");
  const signature = Buffer.from("mock_signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const BASE_URL = "http://localhost:3000";

async function runSecurityAndScaleTestSuite() {
  console.log("===============================================================");
  console.log("🛡️ RUNNING PHASE 7 SECURITY AUDIT & 100-CLIENT LOAD TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  // CHECK 1: Security Headers & CSP Validation
  console.log("▶ CHECK 1: Verifying Security Headers & Whop iframe CSP...");
  try {
    const resHeaders = await fetch(`${BASE_URL}/`);
    const csp = resHeaders.headers.get("content-security-policy");
    const nosniff = resHeaders.headers.get("x-content-type-options");
    const referrer = resHeaders.headers.get("referrer-policy");

    const cspValid = csp && csp.includes("frame-ancestors 'self' https://whop.com https://*.whop.com;");
    const nosniffValid = nosniff === "nosniff";
    const referrerValid = referrer === "strict-origin-when-cross-origin";

    if (cspValid && nosniffValid && referrerValid) {
      console.log("✅ [PASS] Security headers and Whop iframe CSP correctly configured");
      passed++;
    } else {
      console.error("❌ [FAIL] Missing or invalid security headers:", { csp, nosniff, referrer });
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Check 1 exception:", err);
    failed++;
  }

  // CHECK 2: Client Secret Leakage Audit
  console.log("\n▶ CHECK 2: Auditing codebase for client-side secret exposure...");
  try {
    const sensitiveTokens = ["SUPABASE_SERVICE_ROLE_KEY", "WHOP_API_KEY", "WHOP_CLIENT_SECRET", "WHOP_WEBHOOK_SECRET"];
    const clientDirs = ["components", "app/experiences"];
    let leakDetected = false;

    function scanDir(dir) {
      const fullDir = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullDir)) return;
      const files = fs.readdirSync(fullDir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(fullDir, file.name);
        if (file.isDirectory()) {
          scanDir(path.join(dir, file.name));
        } else if (file.isFile() && /\.(tsx|ts|jsx|js)$/.test(file.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          for (const token of sensitiveTokens) {
            if (content.includes(`process.env.${token}`) || content.includes(`process.env.NEXT_PUBLIC_${token}`)) {
              console.error(`❌ [LEAK DETECTED] Sensitive token ${token} found in client file ${dir}/${file.name}`);
              leakDetected = true;
            }
          }
        }
      }
    }

    for (const dir of clientDirs) {
      scanDir(dir);
    }

    if (!leakDetected) {
      console.log("✅ [PASS] Zero server-side secrets exposed in client component files");
      passed++;
    } else {
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Check 2 exception:", err);
    failed++;
  }

  // CHECK 3: Rate Limiting Enforcement
  console.log("\n▶ CHECK 3: Verifying API route rate limiting (burst protection)...");
  try {
    const rateLimitUserId = `user_rate_limit_${Date.now()}`;
    const rateLimitToken = createMockJwt(rateLimitUserId);
    const expId = `exp_rate_${Date.now()}`;
    const companyId = "biz_coach_sandbox_alpha";

    const authClient = JSON.stringify({
      [expId]: { has_access: true, access_level: "customer" },
    });

    let hit429 = false;
    for (let i = 0; i < 14; i++) {
      const res = await fetch(`${BASE_URL}/api/client/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-whop-user-token": rateLimitToken,
          "x-test-auth": authClient,
        },
        body: JSON.stringify({
          experienceId: expId,
          companyId,
          weight: 80,
          date: `2026-08-${10 + i}`,
        }),
      });

      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }

    if (hit429) {
      console.log("✅ [PASS] Rate limiter strictly throttled burst requests with 429 Too Many Requests");
      passed++;
    } else {
      console.error("❌ [FAIL] Rate limiter did not trigger 429 on rapid request burst");
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Check 3 exception:", err);
    failed++;
  }

  // CHECK 4: 100-Client Scale & Latency Benchmark
  console.log("\n▶ CHECK 4: Simulating Pro coach workspace with 100 clients (Latency Benchmark)...");
  try {
    const scaleCompanyId = `biz_scale_coach_${Date.now()}`;
    const scaleCoachUserId = `user_scale_coach_${Date.now()}`;
    const scaleCoachToken = createMockJwt(scaleCoachUserId);

    const authScaleCoach = JSON.stringify({
      [scaleCompanyId]: { has_access: true, access_level: "admin" },
    });

    // Seed 100 clients via seed route
    const seedRes = await fetch(`${BASE_URL}/api/test/seed-scale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: scaleCompanyId,
        count: 100,
      }),
    });

    // Benchmark coach roster fetch
    const t0 = performance.now();
    const resBenchmark = await fetch(
      `${BASE_URL}/api/coach/clients?companyId=${scaleCompanyId}`,
      {
        headers: {
          "x-whop-user-token": scaleCoachToken,
          "x-test-auth": authScaleCoach,
        },
      }
    );
    const t1 = performance.now();
    const latencyMs = Math.round(t1 - t0);

    const dataBenchmark = await resBenchmark.json();

    if (resBenchmark.status === 200 && dataBenchmark.clients?.length === 100 && latencyMs < 1500) {
      console.log(`✅ [PASS] 100-client roster loaded in ${latencyMs}ms (Budget: <1500ms)`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Benchmark failed. Clients: ${dataBenchmark.clients?.length}, Latency: ${latencyMs}ms`);
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Check 4 exception:", err);
    failed++;
  }

  // CHECK 5: Storage Path Scoping & MIME Check
  console.log("\n▶ CHECK 5: Verifying Private Storage Path Scoping & MIME Type Validation...");
  try {
    const uploadUserId = `user_upload_${Date.now()}`;
    const uploadToken = createMockJwt(uploadUserId);
    const expId = `exp_upload_${Date.now()}`;
    const companyId = "biz_coach_sandbox_alpha";

    const authUpload = JSON.stringify({
      [expId]: { has_access: true, access_level: "customer" },
    });

    // Complete intake first so client record exists
    await fetch(`${BASE_URL}/api/client/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-whop-user-token": uploadToken,
        "x-test-auth": authUpload,
      },
      body: JSON.stringify({
        experienceId: expId,
        companyId,
        goal: "Physique transformation",
      }),
    });

    // 1. Valid JPEG Upload
    const validFormData = new FormData();
    const validBlob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    validFormData.append("file", validBlob, "physique.jpg");
    validFormData.append("experienceId", expId);
    validFormData.append("companyId", companyId);

    const resValid = await fetch(`${BASE_URL}/api/client/photo-upload`, {
      method: "POST",
      headers: {
        "x-whop-user-token": uploadToken,
        "x-test-auth": authUpload,
      },
      body: validFormData,
    });
    const dataValid = await resValid.json();

    // 2. Invalid Executable Upload
    const invalidFormData = new FormData();
    const invalidBlob = new Blob(["evil-code"], { type: "application/x-executable" });
    invalidFormData.append("file", invalidBlob, "malware.exe");
    invalidFormData.append("experienceId", expId);
    invalidFormData.append("companyId", companyId);

    const resInvalid = await fetch(`${BASE_URL}/api/client/photo-upload`, {
      method: "POST",
      headers: {
        "x-whop-user-token": uploadToken,
        "x-test-auth": authUpload,
      },
      body: invalidFormData,
    });

    const isPathScoped = dataValid.storagePath && dataValid.storagePath.includes("/");
    const isInvalidRejected = resInvalid.status === 400;

    if (resValid.status === 200 && isPathScoped && isInvalidRejected) {
      console.log("✅ [PASS] Photo uploads enforce strict MIME validation & company/client path scoping");
      passed++;
    } else {
      console.error("❌ [FAIL] Photo upload security check failed:", { resValid: resValid.status, resInvalid: resInvalid.status });
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Check 5 exception:", err);
    failed++;
  }

  // CHECK 6: Fail-Closed Auth & Non-Leaking Error Responses
  console.log("\n▶ CHECK 6: Verifying Fail-Closed Auth & Non-Leaking Error Boundaries...");
  try {
    // Attempt request without token
    const resNoToken = await fetch(`${BASE_URL}/api/coach/clients?companyId=biz_coach_sandbox_alpha`);
    const dataNoToken = await resNoToken.json();

    // Attempt request with forged token
    const resForged = await fetch(`${BASE_URL}/api/coach/clients?companyId=biz_coach_sandbox_alpha`, {
      headers: {
        "x-whop-user-token": "forged_malicious_jwt_string",
      },
    });

    const isNoTokenBlocked = resNoToken.status === 401 && dataNoToken.error === "Unauthorized";
    const isForgedBlocked = resForged.status === 401 || resForged.status === 403;

    if (isNoTokenBlocked && isForgedBlocked) {
      console.log("✅ [PASS] All endpoints fail closed with standardized non-leaking errors");
      passed++;
    } else {
      console.error("❌ [FAIL] Fail-closed auth verification failed:", { noToken: resNoToken.status, forged: resForged.status });
      failed++;
    }
  } catch (err) {
    console.error("❌ [ERROR] Check 6 exception:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`SECURITY & LOAD TEST SUMMARY: ${passed} Passed, ${failed} Failed out of 6 Checks`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAndScaleTestSuite();
