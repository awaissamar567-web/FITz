import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { listCheckins } from "@/lib/services/checkins";
import { getClient } from "@/lib/services/clients";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId parameter" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && searchParams.get("demo") === "true";
    await requireCoachAccess(companyId, isDemo);

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch recent checkins scoped by company.id
    console.log("[Feed Debug] companyId param:", companyId, "company.id:", company.id);
    const checkins = await listCheckins(company.id, undefined, limit);
    console.log("[Feed Debug] checkins returned:", checkins.length);

    // Enrich with client whop_user_id, display_name & goal
    const enrichedFeed = await Promise.all(
      checkins.map(async (item: any) => {
        const client = await getClient(company.id, item.client_id);
        return {
          ...item,
          client_whop_user_id: client?.whop_user_id || "Unknown Client",
          client_display_name: (client as any)?.display_name || client?.whop_user_id || "Member",
          client_goal: client?.goal || null,
        };
      })
    );

    return NextResponse.json({ feed: enrichedFeed }, { status: 200 });
  } catch (error) {
    console.error("[Coach Feed API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
