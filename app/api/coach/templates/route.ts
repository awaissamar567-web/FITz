import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { requirePro } from "@/lib/entitlements";
import { PREBUILT_TEMPLATES } from "@/lib/server/program-templates";
import { apiErrorResponse } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    await requireCoachAccess(companyId);
    const company = await getOrCreateCompany(companyId);
    if (!company) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    requirePro(company, "Reusable program templates");
    return NextResponse.json({ templates: PREBUILT_TEMPLATES }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error, "[Program templates]"); }
}
