import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany, updateCompanySettings } from "@/lib/services/companies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, coach_name, default_checkin_frequency, units, at_risk_threshold_days, avatar_url } = body;

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    await requireCoachAccess(companyId, isDemo);

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updates: any = {};
    if (coach_name !== undefined) updates.coach_name = coach_name;
    if (default_checkin_frequency !== undefined) updates.default_checkin_frequency = default_checkin_frequency;
    if (units !== undefined) updates.units = units;
    if (at_risk_threshold_days !== undefined) updates.at_risk_threshold_days = parseInt(at_risk_threshold_days);
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const updatedCompany = await updateCompanySettings(companyId, updates);

    return NextResponse.json({ success: true, company: updatedCompany }, { status: 200 });
  } catch (error: any) {
    console.error("[Coach Settings API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
