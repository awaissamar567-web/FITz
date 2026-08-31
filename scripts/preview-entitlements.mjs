// Offline browser QA only. Proxies bind to loopback and inject mock identities ONLY
// into localhost:3100 after confirming its mock-only seed endpoint is available.
import http from "node:http";
const base = "http://127.0.0.1:3100";
const companyId = "biz_preview_entitlements";
const ids = Array.from({ length: 7 }, (_, i) => ({ user: `user_preview_member_${i + 1}`, exp: `exp_preview_member_${i + 1}` }));
async function post(path, body, headers = {}) {
  const res = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Mock preview setup failed: ${res.status}`);
}
await post("/api/test/seed-scale", { companyId: "biz_preview_safety_check", count: 1 });
for (const [i, member] of ids.entries()) {
  await post("/api/webhooks/whop", { id: `evt_preview_${Date.now()}_${i}`, action: "membership.activated", data: { company_id: companyId, user_id: member.user, experience_id: member.exp } }, { "x-test-webhook": "true" });
  if (i < 3) await post("/api/client/intake", { companyId, experienceId: member.exp, display_name: `Preview Member ${i + 1}`, goal: "Build training consistency", stats: {} }, { "x-dev-user-id": member.user, "x-test-auth": JSON.stringify({ [member.exp]: { has_access: true, access_level: "customer" } }) });
}
for (const [port, identity, permissions] of [
  [3101, "user_coach_preview", { [companyId]: { has_access: true, access_level: "admin" } }],
  [3102, ids[0].user, { [ids[0].exp]: { has_access: true, access_level: "customer" } }],
  [3103, ids[6].user, { [ids[6].exp]: { has_access: true, access_level: "customer" } }],
]) {
  http.createServer((req, res) => {
    const upstream = http.request({ hostname: "127.0.0.1", port: 3100, path: req.url, method: req.method,
      headers: { ...req.headers, host: "localhost:3100", "x-dev-user-id": identity, "x-test-auth": JSON.stringify(permissions) } }, reply => { res.writeHead(reply.statusCode, reply.headers); reply.pipe(res); });
    upstream.on("error", () => { res.writeHead(502); res.end("Mock preview unavailable"); });
    req.pipe(upstream);
  }).listen(port, "127.0.0.1");
}
console.log("Coach preview: http://localhost:3101/dashboard/biz_preview_entitlements");
console.log("Member preview: http://localhost:3102/experiences/exp_preview_member_1");
console.log("Waiting member: http://localhost:3103/experiences/exp_preview_member_7");
