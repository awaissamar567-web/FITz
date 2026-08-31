import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { saveCoachingSelection } from "@/lib/services/entitlements";
import { apiErrorResponse } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  try {
    const { companyId, clientIds } = (await req.json()) ?? {};
    if (typeof companyId !== "string") return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    await requireCoachAccess(companyId);
    const company = await getOrCreateCompany(companyId);
    if (!company) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    return NextResponse.json({ company: await saveCoachingSelection(company, clientIds) });
  } catch (error) { return apiErrorResponse(error, "[Coaching slots]"); }
}
