import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getOrCreateCompany, updateCompanySettings } from "@/lib/services/companies";
import { withCoachAvatar } from "@/lib/services/coach-profile";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, coach_name, default_checkin_frequency, units, at_risk_threshold_days } = body;

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    await requireCoachAccess(companyId, isDemo);

    if (coach_name !== undefined && (typeof coach_name !== "string" || coach_name.trim().length < 2 || coach_name.trim().length > 80)) return NextResponse.json({ error: "Enter a coach name between 2 and 80 characters." }, { status: 400 });
    if (default_checkin_frequency !== undefined && !["daily", "weekly"].includes(default_checkin_frequency)) return NextResponse.json({ error: "Invalid check-in frequency" }, { status: 400 });
    if (units !== undefined && !["kg", "lbs"].includes(units)) return NextResponse.json({ error: "Invalid measurement units" }, { status: 400 });
    if (at_risk_threshold_days !== undefined && (!Number.isInteger(at_risk_threshold_days) || at_risk_threshold_days < 3 || at_risk_threshold_days > 14)) return NextResponse.json({ error: "Inactivity threshold must be from 3 to 14 days." }, { status: 400 });

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updates: any = {};
    if (coach_name !== undefined) updates.coach_name = coach_name.trim();
    if (default_checkin_frequency !== undefined) updates.default_checkin_frequency = default_checkin_frequency;
    if (units !== undefined) updates.units = units;
    if (at_risk_threshold_days !== undefined) updates.at_risk_threshold_days = parseInt(at_risk_threshold_days);

    const updatedCompany = await updateCompanySettings(companyId, updates);

    if (!updatedCompany) throw new Error("Company settings were not saved");
    return NextResponse.json({ success: true, company: await withCoachAvatar(updatedCompany) }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "[Coach Settings API]");
  }
}
