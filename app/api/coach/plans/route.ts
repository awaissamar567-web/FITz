import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { getClient } from "@/lib/services/clients";
import { savePlan, getCurrentPlan } from "@/lib/services/plans";
import { checkPaywallStatus } from "@/lib/services/paywall";
import { FREE_TIER_CLIENT_LIMIT } from "@/lib/constants/plans";
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

    const { companyId, clientId, split_name, exercises, macros, schedule, pdf_url } = body || {};

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

    // Paywall Check: active-client cap on Free Tier
    const existingPlan = await getCurrentPlan(company.id, client.id);
    const paywall = await checkPaywallStatus(company);

    if (company.plan === "free" && paywall.activeCount > FREE_TIER_CLIENT_LIMIT && !existingPlan) {
      return NextResponse.json(
        {
          error: `Free tier client limit reached (${FREE_TIER_CLIENT_LIMIT}/${FREE_TIER_CLIENT_LIMIT} active clients). Upgrade to Pro for unlimited clients.`,
          paywall_required: true,
          limit: FREE_TIER_CLIENT_LIMIT,
          activeCount: paywall.activeCount,
        },
        { status: 402 }
      );
    }

    // Save/Update plan
    const plan = await savePlan(company.id, client.id, {
      split_name: split_name || "Custom Split",
      exercises: (exercises as ExerciseItem[]) || [],
      macros: (macros as MacroTargets) || { calories: 2000, protein: 150, carbs: 200, fat: 65 },
      schedule: schedule || undefined,
      pdf_url: pdf_url || undefined,
    });

    return NextResponse.json({ success: true, plan }, { status: 200 });
  } catch (error) {
    console.error("[Coach Plan API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
