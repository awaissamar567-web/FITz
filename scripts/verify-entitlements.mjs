import assert from "node:assert/strict";

// This suite must never target a live deployment or real Whop payment flow.
const base = process.env.BASE_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local mock server required");
let passed = 0;
const stamp = Date.now();
const companyId = `biz_entitlements_${stamp}`;
const foreignCompanyId = `biz_other_${stamp}`;
const coachId = `user_coach_${stamp}`;
const coachHeaders = { "x-dev-user-id": coachId, "x-test-auth": JSON.stringify({ [companyId]: { has_access: true, access_level: "admin" } }) };
const members = Array.from({ length: 7 }, (_, i) => ({ user: `user_member_${stamp}_${i}`, experience: `exp_member_${stamp}_${i}` }));
const memberHeaders = member => ({ "x-dev-user-id": member.user, "x-test-auth": JSON.stringify({ [member.experience]: { has_access: true, access_level: "customer" } }) });

async function request(path, { body, headers = coachHeaders, method } = {}) {
  const response = await fetch(`${base}${path}`, { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { text }; }
  return { status: response.status, data };
}
function check(condition, message) { assert.ok(condition, message); passed++; console.log(`PASS ${message}`); }
async function event(action, data) {
  return request("/api/webhooks/whop", { headers: { "x-test-webhook": "true" }, body: { id: `evt_${stamp}_${passed}_${Math.random().toString(36).slice(2)}`, action, data } });
}
const roster = () => request(`/api/coach/clients?companyId=${companyId}`);
const assign = (clientId, extra = {}) => request("/api/coach/plans", { body: { companyId, clientId, split_name: "Test workout", exercises: [{ name: "Squat", sets: 3, reps: "8" }], ...extra } });
const choose = clientIds => request("/api/coach/slots", { body: { companyId, clientIds } });
const memberWrite = (member, route, extra = {}) => request(`/api/client/${route}`, { headers: memberHeaders(member), body: { companyId, experienceId: member.experience, goal: "Test goal", weight: 70, ...extra } });
async function photoUpload(member) {
  const form = new FormData();
  form.set("companyId", companyId); form.set("experienceId", member.experience);
  form.set("file", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "mock.png");
  return fetch(`${base}/api/client/photo-upload`, { method: "POST", headers: memberHeaders(member), body: form });
}

// A working seed endpoint proves this server uses mock storage, never a real database.
const safe = await request("/api/test/seed-scale", { headers: {}, body: { companyId: foreignCompanyId, count: 1 } });
check(safe.status === 201, "isolated mock database confirmed");
for (const member of members) {
  const result = await event("membership.activated", { company_id: companyId, user_id: member.user, experience_id: member.experience });
  assert.equal(result.status, 200, JSON.stringify(result.data));
}
let result = await roster();
check(result.status === 200 && result.data.clients.length === 7, "seven memberships remain visible on Free");
check(result.data.paywallStatus.activeCount === 3 && result.data.paywallStatus.waitingCount === 4, "Free enables three coaching slots, not seven");
const ids = result.data.paywallStatus.selectedIds;
const clientFor = m => result.data.clients.find(c => c.whop_user_id === m.user);
const initialActive = members.filter(m => ids.includes(clientFor(m).id));
const waiting = members.filter(m => !ids.includes(clientFor(m).id));
for (const id of ids) check((await assign(id)).status === 200, "selected Free client can receive a workout even with seven members");
const waitingId = clientFor(waiting[0]).id;
check((await assign(waitingId)).status === 402, "unselected client cannot receive a new workout");
check((await memberWrite(waiting[0], "intake")).status === 402, "unselected member intake is paused");
check((await memberWrite(waiting[0], "checkin")).status === 402, "unselected member check-in is paused");
check((await memberWrite(initialActive[0], "intake")).status === 200, "selected Free member can complete intake");
const basicCheckin = await memberWrite(initialActive[0], "checkin");
check(basicCheckin.status === 201, "selected Free member can submit a basic check-in");
const internalHistory = await request(`/api/client/plan?companyId=${clientFor(initialActive[0]).company_id}&experienceId=${initialActive[0].experience}`, { headers: memberHeaders(initialActive[0]) });
check(internalHistory.status === 200 && internalHistory.data.checkins.some(c => c.id === basicCheckin.data.checkin.id), "member's internal company ID resolves the same tenant as the coach");
check((await photoUpload(initialActive[0])).status === 402, "Free multipart photo upload is rejected server-side");
check((await fetch(`${base}/api/coach/slots`, { method: "POST", headers: { ...coachHeaders, "Content-Type": "application/json" }, body: "{" })).status === 400, "malformed selection JSON returns 400");
check((await request(`/api/coach/clients?companyId=${companyId}`, { headers: { "x-dev-user-id": coachId, "x-test-auth": JSON.stringify({ [companyId]: { has_access: false, access_level: "admin" } }) } })).status === 403, "revoked admin access is denied");
check((await request("/api/webhooks/whop", { headers: {}, body: { id: `evt_unsigned_${stamp}`, action: "payment.succeeded", data: { company_id: companyId, plan_id: "plan_fitz_pro" } } })).status === 401, "unsigned payment webhook is rejected");
check((await assign(ids[0], { macros: { calories: 2000 } })).status === 402, "Free cannot set macro targets directly through API");
check((await request(`/api/coach/templates?companyId=${companyId}`)).status === 402, "Free cannot retrieve premium templates");
check((await request("/api/coach/retention/evaluate", { body: { companyId } })).status === 402, "Free cannot invoke churn evaluation");
check((await memberWrite(initialActive[0], "checkin", { macro_hit: { hitTarget: true } })).status === 402, "Free cannot submit macro tracking");
check((await memberWrite(initialActive[0], "checkin", { photo_url: "https://example.com/test.jpg" })).status === 402, "Free cannot bypass the photo upload gate using a URL");
check((await request("/api/coach/feedback", { body: { companyId, clientId: ids[0], checkinId: basicCheckin.data.checkin.id, feedback: "Test feedback" } })).status === 402, "Free cannot send coach feedback");
check((await choose([...ids, waitingId])).status === 402, "four-slot Free selection rejected");
check((await choose([ids[0], ids[0]])).status === 400, "duplicate selection rejected");
check((await choose(["foreign-client"])).status === 400, "cross-tenant selection rejected");
check((await request("/api/coach/slots", { headers: memberHeaders(initialActive[0]), body: { companyId, clientIds: ids } })).status === 403, "ordinary member cannot select coaching slots");
check((await request(`/api/coach/clients?companyId=${foreignCompanyId}`)).status === 403, "coach cannot read another workspace");
check((await request(`/api/coach/clients?companyId=${companyId}`, { headers: {} })).status === 401, "missing identity fails closed");
const swapped = [waitingId, ids[1], ids[2]];
check((await choose(swapped)).status === 200, "coach can choose a different set of three");
check((await assign(ids[0])).status === 402, "existing plan does not bypass a paused coaching slot");
check((await assign(waitingId)).status === 200, "newly enabled client can receive a workout");
const history = await request(`/api/client/plan?companyId=${companyId}&experienceId=${initialActive[0].experience}`, { headers: memberHeaders(initialActive[0]) });
check(history.status === 200 && history.data.checkins.length === 1 && !history.data.coachingEnabled, "paused member retains read-only check-in history");
check((await choose([])).status === 200 && (await roster()).data.paywallStatus.activeCount === 0, "explicit empty selection does not auto-fill");
await choose(swapped);
await event("payment.succeeded", { company_id: companyId, plan_id: "plan_fitz_pro" });
check((await roster()).data.paywallStatus.plan === "pro", "mock payment success activates Pro server-side");
check((await roster()).data.paywallStatus.activeCount === 7, "Pro expands capacity without deleting Free selection");
check((await request(`/api/coach/templates?companyId=${companyId}`)).data.templates?.ppl?.schedule != null, "Pro can load reusable templates");
check((await assign(ids[0], { macros: { calories: 2000, protein: 150, carbs: 200, fat: 60 } })).status === 200, "Pro can set macro targets");
check((await request("/api/coach/retention/evaluate", { body: { companyId } })).status === 200, "Pro can run churn evaluation");
const proCheckin = await memberWrite(initialActive[0], "checkin", { macro_hit: { hitTarget: true } });
check(proCheckin.status === 201, "Pro member can submit macro tracking");
check((await photoUpload(initialActive[0])).status === 200, "selected Pro member can upload a mock progress photo");
const feedback = await request("/api/coach/feedback", { body: { companyId, clientId: ids[0], checkinId: basicCheckin.data.checkin.id, feedback: "Keep the same tempo next week." } });
check(feedback.status === 200, "Pro feedback persists successfully");
const savedHistory = await request(`/api/client/plan?companyId=${companyId}&experienceId=${initialActive[0].experience}`, { headers: memberHeaders(initialActive[0]) });
check(savedHistory.data.checkins.some(c => c.coach_feedback === "Keep the same tempo next week."), "member history receives persisted coach feedback");
check((await request("/api/coach/feedback", { body: { companyId, clientId: ids[1], checkinId: basicCheckin.data.checkin.id, feedback: "Wrong client" } })).status === 404, "feedback cannot target another client's check-in");
const large = await request("/api/test/seed-scale", { headers: {}, body: { companyId, count: 250 } });
check(large.status === 201, "large roster fixture seeded");
const bigRoster = await roster();
check(bigRoster.data.clients.length === 257 && bigRoster.data.paywallStatus.activeCount === 250, "257 members remain visible but Pro caps coaching at 250");
const allIds = bigRoster.data.clients.map(c => c.id);
check((await choose(allIds.slice(0, 251))).status === 402, "251-slot Pro selection rejected");
check((await choose(allIds.slice(0, 250))).status === 200, "exactly 250 Pro slots accepted");
const overflow = allIds[250];
check((await assign(overflow)).status === 402, "251st client blocked from workout writes");
await event("payment.failed", { company_id: companyId, plan_id: "plan_fitz_pro" });
const downgraded = await roster();
check(downgraded.data.paywallStatus.plan === "free" && downgraded.data.paywallStatus.activeCount === 3, "failed-payment webhook restores Free capacity without locking dashboard");
check([...downgraded.data.paywallStatus.selectedIds].sort().join() === [...swapped].sort().join(), "downgrade restores coach's saved Free selection");
check(downgraded.data.clients.length === 257, "downgrade preserves every client record");
check((await request(`/api/coach/templates?companyId=${companyId}`)).status === 402, "stale Pro session cannot load templates after downgrade");
const requests = await Promise.all([choose(swapped), choose(ids), choose([...ids, waitingId])]);
check(requests.filter(r => r.status === 200).length === 2 && requests[2].status === 402 && (await roster()).data.paywallStatus.activeCount === 3, "concurrent selection requests never grant four Free slots");
const activeNow = (await roster()).data.paywallStatus.selectedIds;
const selectedMember = members.find(m => (downgraded.data.clients.find(c => c.whop_user_id === m.user)?.id) === activeNow[0]);
await event("membership.deactivated", { company_id: companyId, user_id: selectedMember.user });
check((await roster()).data.paywallStatus.activeCount === 2, "cancelled selected member releases access without selecting a replacement");
check((await memberWrite(selectedMember, "checkin")).status === 402, "cancelled member cannot bypass coaching pause with a stale session");
await event("membership.activated", { company_id: companyId, user_id: selectedMember.user, experience_id: selectedMember.experience });
check((await roster()).data.paywallStatus.activeCount === 3, "reactivation restores saved selection without exceeding the cap");
const sameCount = downgraded.data.clients.length;
await event("membership.activated", { company_id: companyId, user_id: members[0].user, experience_id: members[0].experience });
check((await roster()).data.clients.length === sameCount && (await roster()).data.paywallStatus.activeCount <= 3, "duplicate membership activation cannot inflate coaching slots");
console.log(`\n${passed} entitlement checks passed. Live Whop payment and real-member tests are separate.`);
