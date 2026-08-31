import { NextRequest, NextResponse } from "next/server";
import { memberContext } from "@/lib/member-context";
import { coachingSlots } from "@/lib/entitlements";
import { listClients } from "@/lib/services/clients";
import { apiErrorResponse } from "@/lib/api-errors";
import { getCurrentPlan } from "@/lib/services/plans";
import { listCheckins } from "@/lib/services/checkins";

/**
 * GET: Retrieve active workout plan and check-in history for the member.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId") || "exp_default";
    const companyId = searchParams.get("companyId") || "biz_default_coach";
    const isDemo = process.env.NODE_ENV !== "production" && searchParams.get("demo") === "true";
    const { company, client } = await memberContext(experienceId, companyId, isDemo);
    const slots = coachingSlots(company, await listClients(company.id));
    const plan = await getCurrentPlan(company.id, client.id);
    const checkins = await listCheckins(company.id, client.id, 20);

    return NextResponse.json({ plan, checkins, isPro: company.plan === "pro", coachingEnabled: slots.selectedIds.includes(client.id) }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "[Plan GET API]");
  }
}
