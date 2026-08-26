import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, evaluateWhopAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { getClient } from "@/lib/services/clients";
import { listCheckins } from "@/lib/services/checkins";
import { getCurrentPlan } from "@/lib/services/plans";

interface ParamsProps {
  params: Promise<{
    clientId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: ParamsProps) {
  try {
    const { clientId } = await params;
    const headerList = await headers();
    const rawToken = headerList.get("x-whop-user-token") || headerList.get("authorization")?.replace("Bearer ", "");
    const testMockHeader = headerList.get("x-test-auth");
    const devUserId = headerList.get("x-dev-user-id");
    const userId = rawToken ? extractUserIdFromToken(rawToken) : devUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId parameter" }, { status: 400 });
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

    // Retrieve client strictly scoped by company.id
    const client = await getClient(company.id, clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found under this company" }, { status: 404 });
    }

    // Retrieve checkins and current plan
    const checkins = await listCheckins(company.id, client.id, 50);
    const plan = await getCurrentPlan(company.id, client.id);

    return NextResponse.json({ client, checkins, plan }, { status: 200 });
  } catch (error) {
    console.error("[Coach Single Client API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
