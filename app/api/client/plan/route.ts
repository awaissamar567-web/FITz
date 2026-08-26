import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, evaluateWhopAccess } from "@/lib/whop-auth";
import { getClientByWhopUserId } from "@/lib/services/clients";
import { getCurrentPlan } from "@/lib/services/plans";
import { getOrCreateCompany } from "@/lib/services/companies";

/**
 * GET: Retrieve active workout and macro plan for the authenticated member.
 */
export async function GET(req: NextRequest) {
  try {
    const headerList = await headers();
    const rawToken = headerList.get("x-whop-user-token") || headerList.get("authorization")?.replace("Bearer ", "");
    const testMockHeader = headerList.get("x-test-auth");
    const devUserId = headerList.get("x-dev-user-id");
    const userId = rawToken ? extractUserIdFromToken(rawToken) : devUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId") || "exp_default";
    const companyId = searchParams.get("companyId") || "biz_default_coach";

    // Verify member access
    const access = await evaluateWhopAccess(userId, experienceId, testMockHeader);
    if (!access.has_access) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const client = await getClientByWhopUserId(company.id, userId);
    if (!client) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    const plan = await getCurrentPlan(company.id, client.id);

    return NextResponse.json({ plan }, { status: 200 });
  } catch (error) {
    console.error("[Plan GET API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
