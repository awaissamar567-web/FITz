import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, evaluateWhopAccess } from "@/lib/whop-auth";
import { getClientByWhopUserId, getClient } from "@/lib/services/clients";
import { getCurrentPlan } from "@/lib/services/plans";
import { listCheckins } from "@/lib/services/checkins";
import { getOrCreateCompany } from "@/lib/services/companies";

/**
 * GET: Retrieve active workout plan and check-in history for the member.
 */
export async function GET(req: NextRequest) {
  try {
    const headerList = await headers();
    const rawToken = headerList.get("x-whop-user-token") || headerList.get("authorization")?.replace("Bearer ", "");
    const testMockHeader = headerList.get("x-test-auth");
    const devUserId = headerList.get("x-dev-user-id");

    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId") || "exp_default";
    const companyId = searchParams.get("companyId") || "biz_default_coach";
    const clientIdParam = searchParams.get("clientId");
    const isDemo = searchParams.get("demo") === "true" || companyId.startsWith("biz_coach_alex") || companyId.startsWith("biz_");

    const userId = rawToken
      ? extractUserIdFromToken(rawToken)
      : devUserId || (isDemo ? clientIdParam || "user_marcus" : null);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify member access (bypass in demo mode)
    if (!isDemo) {
      const access = await evaluateWhopAccess(userId, experienceId, testMockHeader);
      if (!access.has_access) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    }

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let client = clientIdParam ? await getClient(company.id, clientIdParam) : null;
    if (!client) {
      client = await getClientByWhopUserId(company.id, userId);
    }
    if (!client && experienceId) {
      client = await getClientByWhopUserId(company.id, experienceId);
    }

    if (!client) {
      return NextResponse.json({ plan: null, checkins: [] }, { status: 200 });
    }

    const plan = await getCurrentPlan(company.id, client.id);
    const checkins = await listCheckins(company.id, client.id, 20);

    return NextResponse.json({ plan, checkins }, { status: 200 });
  } catch (error) {
    console.error("[Plan GET API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
