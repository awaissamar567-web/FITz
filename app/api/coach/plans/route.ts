import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getOrCreateCompany } from "@/lib/services/companies";
import { getClient } from "@/lib/services/clients";
import { savePlan, getCurrentPlan } from "@/lib/services/plans";

import { requireCoachingSlot } from "@/lib/services/entitlements";
import { requirePro } from "@/lib/entitlements";
import { ExerciseItem, MacroTargets } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { companyId, clientId, split_name, exercises, macros, schedule, pdf_url, template_id } = body || {};

    if (!companyId || !clientId) {
      return NextResponse.json({ error: "Missing companyId or clientId" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    await requireCoachAccess(companyId, isDemo);

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Verify client exists under this company
    const client = await getClient(company.id, clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found under this company" }, { status: 404 });
    }

    const currentCompany = await requireCoachingSlot(company, client.id);
    const existingPlan = await getCurrentPlan(company.id, client.id);
    if (template_id) requirePro(currentCompany, "Reusable program templates");
    if (macros != null) requirePro(currentCompany, "Macro targets");

    // Save/Update plan
    const plan = await savePlan(company.id, client.id, {
      split_name: split_name || "Custom Split",
      exercises: (exercises as ExerciseItem[]) || [],
      // Omitted targets preserve history after downgrade.
      macros: (macros as MacroTargets) || existingPlan?.macros || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      schedule: schedule || undefined,
      pdf_url: pdf_url || undefined,
    });

    return NextResponse.json({ success: true, plan }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "[Coach Plan API]");
  }
}
