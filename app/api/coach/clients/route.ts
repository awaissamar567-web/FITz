import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, evaluateWhopAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { listClients } from "@/lib/services/clients";
import { listCheckins } from "@/lib/services/checkins";
import { ClientStatus } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
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
    const statusFilter = (searchParams.get("status") as ClientStatus) || undefined;
    const query = searchParams.get("query")?.toLowerCase() || "";

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId parameter" }, { status: 400 });
    }

    // Verify coach admin access
    const access = await evaluateWhopAccess(userId, companyId, testMockHeader);
    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required for this coach workspace" }, { status: 403 });
    }

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const clients = await listClients(company.id, statusFilter);

    // Attach latest check-in & days since check-in calculation
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const checkins = await listCheckins(company.id, client.id, 1);
        const lastCheckin = checkins[0] || null;
        let daysSinceLastCheckin: number | null = null;

        if (lastCheckin) {
          const checkinDate = new Date(lastCheckin.date).getTime();
          const diffMs = Date.now() - checkinDate;
          daysSinceLastCheckin = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        return {
          ...client,
          lastCheckin,
          daysSinceLastCheckin,
        };
      })
    );

    // Apply text search if query provided
    const filteredClients = query
      ? enrichedClients.filter(
          (c) =>
            c.whop_user_id.toLowerCase().includes(query) ||
            (c.goal && c.goal.toLowerCase().includes(query))
        )
      : enrichedClients;

    const { checkPaywallStatus } = await import("@/lib/services/paywall");
    const paywallStatus = await checkPaywallStatus(company);

    return NextResponse.json({ clients: filteredClients, paywallStatus }, { status: 200 });
  } catch (error) {
    console.error("[Coach Clients API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
