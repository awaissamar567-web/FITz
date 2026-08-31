import { NextRequest, NextResponse } from "next/server";
import { memberContext } from "@/lib/member-context";
import { requireCoachingSlot } from "@/lib/services/entitlements";
import { apiErrorResponse } from "@/lib/api-errors";
import { updateClientIntake } from "@/lib/services/clients";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experienceId, companyId, display_name, fullName, name, goal, stats, experience_level, equipment, limitations } = body;
    const expId = experienceId || companyId || "exp_default";

    if (!goal) {
      return NextResponse.json({ error: "Missing required intake fields" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    const { company, client } = await memberContext(expId, companyId, isDemo);
    await requireCoachingSlot(company, client.id);

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
