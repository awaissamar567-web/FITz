import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { syncCompanyAtRiskClients } from "@/lib/services/retention";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {}

    const companyId = body.companyId || req.nextUrl.searchParams.get("companyId");
    const asOfDateStr = body.asOfDate || req.nextUrl.searchParams.get("asOfDate");
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : undefined;

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    await requireCoachAccess(companyId, isDemo);

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const results = await syncCompanyAtRiskClients(company, asOfDate);

    return NextResponse.json({ success: true, companyId, ...results }, { status: 200 });
  } catch (error) {
    console.error("[Retention Evaluation API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
