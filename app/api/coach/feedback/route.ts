import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { requireCoachingSlot } from "@/lib/services/entitlements";
import { requirePro } from "@/lib/entitlements";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiErrorResponse } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  try {
    const { companyId, clientId, checkinId, feedback } = (await req.json()) ?? {};
    if (typeof companyId !== "string" || typeof clientId !== "string" || typeof checkinId !== "string" || typeof feedback !== "string" || feedback.length > 2000) {
      return NextResponse.json({ error: "Supply a workspace, client, check-in and feedback up to 2,000 characters." }, { status: 400 });
    }
    await requireCoachAccess(companyId);
    const company = await getOrCreateCompany(companyId);
    if (!company) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    const current = await requireCoachingSlot(company, clientId);
    requirePro(current, "Coach feedback");
    const { data, error } = await supabaseAdmin.from("checkins").update({ coach_feedback: feedback.trim() || null })
      .eq("id", checkinId).eq("client_id", clientId).eq("company_id", company.id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    return NextResponse.json({ checkin: data });
  } catch (error) { return apiErrorResponse(error, "[Coach feedback]"); }
}
