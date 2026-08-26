import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, requireClientAccess } from "@/lib/whop-auth";
import { getClient, updateClientSettings } from "@/lib/services/clients";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, clientId, display_name, units_preference, avatar_url } = body;

    if (!companyId || !clientId) {
      return NextResponse.json({ error: "Missing companyId or clientId" }, { status: 400 });
    }

    const headerList = await headers();
    const rawToken = headerList.get("x-whop-user-token") || headerList.get("authorization")?.replace("Bearer ", "");
    const devUserId = headerList.get("x-dev-user-id");
    const userId = rawToken ? extractUserIdFromToken(rawToken) : devUserId;

    const isDemo = req.nextUrl.searchParams.get("demo") === "true" || companyId.startsWith("biz_coach_alex");

    if (!userId && !isDemo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve client record
    const client = await getClient(companyId, clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updates: any = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (units_preference !== undefined) updates.units_preference = units_preference;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const updatedClient = await updateClientSettings(companyId, clientId, updates);

    return NextResponse.json({ success: true, client: updatedClient }, { status: 200 });
  } catch (error: any) {
    console.error("[Client Settings API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update client settings" }, { status: 500 });
  }
}
