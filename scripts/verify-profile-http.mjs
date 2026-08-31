import assert from "node:assert/strict";
const base = process.env.FITZ_TEST_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname)) throw new Error("Mock tests must target loopback only");
const companyId = `biz_profile_test_${Date.now()}`;
const headers = { "x-dev-user-id": "user_profile_coach", "x-test-auth": JSON.stringify({ [companyId]: { has_access: true, access_level: "admin" } }) };
let count = 0;
function check(condition, text) { assert.ok(condition, text); console.log(`PASS ${text}`); count++; }
async function call(path, options = {}) {
  const res = await fetch(base + path, { headers, signal: AbortSignal.timeout(30000), ...options });
  const data = await res.json(); return { status: res.status, data };
}
const seed = await call("/api/test/seed-scale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, count: 1 }) });
check(seed.status === 201, "mock database isolation confirmed before writes");
const path = `/api/coach/profile?companyId=${companyId}`;
check((await call(path, { headers: {} })).status === 401, "anonymous profile access denied");
check((await call(path, { headers: { "x-dev-user-id": "user_member", "x-test-auth": JSON.stringify({ [companyId]: { has_access: true, access_level: "customer" } }) } })).status === 403, "member cannot read coach settings");
function form(extra = {}) { const f = new FormData(); for (const [k, v] of Object.entries({ coach_name: " Test Coach ", coach_years_experience: "0", coach_expertise: "Strength", ...extra })) f.set(k, v); return f; }
check((await call(path, { method: "POST", body: form({ coach_years_experience: "-1" }) })).status === 400, "invalid years rejected over HTTP");
let saved = await call(path, { method: "POST", body: form({ plan: "pro" }) });
check(saved.status === 200 && saved.data.company.coach_name === "Test Coach" && saved.data.company.plan === "free", "profile saves without granting Pro");
check((await call(path)).data.company.coach_years_experience === 0, "profile persists across requests");
check((await call(path, { method: "POST", body: form({ photo: new File(["fake"], "a.png", { type: "image/png" }) }) })).status === 400, "fake image content rejected over HTTP");
const png = new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=", "base64")], "photo.png", { type: "image/png" });
saved = await call(path, { method: "POST", body: form({ photo: png }) });
check(saved.status === 200 && saved.data.company.coach_avatar_path.startsWith(saved.data.company.id + "/"), "photo receives workspace-scoped storage path");
check((await call(path, { method: "POST", body: form({ remove_photo: "true" }) })).data.company.coach_avatar_path === null, "photo removal persists over HTTP");
check((await call(`/api/coach/checkout?companyId=${companyId}`, { method: "POST", headers: {} })).status === 401, "anonymous checkout denied");
check((await call(`/api/coach/checkout?companyId=${companyId}`, { method: "POST" })).status === 503, "mock checkout cannot initiate real payment");
const roster = await call(`/api/coach/clients?companyId=${companyId}`);
const client = roster.data.clients[0];
const docPath = `/api/coach/document-upload?companyId=${companyId}&clientId=${client.id}`;
const pdf = new FormData(); pdf.set("file", new File(["%PDF-1.4\n%%EOF"], "mock.pdf", { type: "application/pdf" }));
const uploaded = await call(docPath, { method: "POST", body: pdf });
check(uploaded.status === 200 && uploaded.data.storagePath.startsWith(`${client.company_id}/${client.id}/`), "PDF upload is scoped to selected client");
const savePlan = pdf_url => call("/api/coach/plans", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ companyId, clientId: client.id, split_name: "Document test", exercises: [], pdf_url }) });
check((await savePlan("blob:http://localhost/temporary")).status === 400, "browser-local PDF links cannot be persisted");
check((await savePlan(`foreign/${client.id}/a.pdf`)).status === 400, "foreign workspace PDF rejected");
check((await savePlan(uploaded.data.storagePath)).status === 200, "private PDF path saved with routine");
const detail = await call(`/api/coach/clients/${client.id}?companyId=${companyId}`);
check(detail.data.plan.pdf_url.startsWith("https://storage.fitz.local/workout-documents/"), "reloaded plan resolves a downloadable PDF URL");
console.log(`\n${count} profile and PDF HTTP checks passed (mock storage, no live payment).`);
