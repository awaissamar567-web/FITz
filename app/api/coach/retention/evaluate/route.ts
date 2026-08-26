import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, evaluateWhopAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { syncCompanyAtRiskClients } from "@/lib/services/retention";

export async function POST(req: NextRequest) {
  try {
    const headerList = await headers();
    const rawToken = headerList.get("x-whop-user-token") || headerList.get("authorization")?.replace("Bearer ", "");
    const testMockHeader = headerList.get("x-test-auth");
    const devUserId = headerList.get("x-dev-user-id");
    const userId = rawToken ? extractUserIdFromToken(rawToken) : devUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Verify coach admin access
    const access = await evaluateWhopAccess(userId, companyId, testMockHeader);
    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

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
