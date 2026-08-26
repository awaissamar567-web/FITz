import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/whop-auth";
import { getClientByWhopUserId, getClient } from "@/lib/services/clients";
import { getCurrentPlan } from "@/lib/services/plans";
import { listCheckins } from "@/lib/services/checkins";
import { getOrCreateCompany } from "@/lib/services/companies";

/**
 * GET: Retrieve active workout plan and check-in history for the member.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId") || "exp_default";
    const companyId = searchParams.get("companyId") || "biz_default_coach";
    const isDemo = process.env.NODE_ENV !== "production" && searchParams.get("demo") === "true";
    const auth = await requireClientAccess(experienceId, isDemo);
    const userId = auth.userId;

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let client = await getClientByWhopUserId(company.id, userId);
    if (!client && isDemo) {
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
