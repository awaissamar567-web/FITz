import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getClientByWhopUserId, updateClientIntake, createOrReactivateClient } from "@/lib/services/clients";
import { getOrCreateCompany } from "@/lib/services/companies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experienceId, companyId, display_name, fullName, name, goal, stats, experience_level, equipment, limitations } = body;
    const expId = experienceId || companyId || "exp_default";

    if (!goal) {
      return NextResponse.json({ error: "Missing required intake fields" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    const auth = await requireClientAccess(expId, isDemo);
    const userId = auth.userId;

    // Resolve company
    const targetCompanyId = companyId || "biz_default_coach";
    const company = await getOrCreateCompany(targetCompanyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Resolve client
    let client = await getClientByWhopUserId(company.id, userId);
    if (!client) {
      client = await createOrReactivateClient(company.id, userId, expId);
    }

    if (!client) {
      return NextResponse.json({ error: "Failed to resolve client record" }, { status: 500 });
    }

    // Update intake data with strict field allowlist
    const updatedClient = await updateClientIntake(company.id, client.id, {
      display_name: display_name || fullName || name || undefined,
      goal,
      stats: stats || {},
      experience_level: experience_level || "intermediate",
      equipment: equipment || { gymAccess: true },
      limitations: limitations || null,
    });

    return NextResponse.json({ success: true, client: updatedClient }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "[Intake API]");
  }
}
