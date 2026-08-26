import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/whop-auth";
import { getClient, getClientByWhopUserId, updateClientSettings } from "@/lib/services/clients";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, clientId, experienceId, display_name, units_preference, avatar_url } = body;

    if (!companyId || !experienceId) {
      return NextResponse.json({ error: "Missing companyId or experienceId" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    const auth = await requireClientAccess(experienceId, isDemo);

    let client = await getClientByWhopUserId(companyId, auth.userId);
    if (!client && isDemo && clientId) client = await getClient(companyId, clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updates: any = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (units_preference !== undefined) updates.units_preference = units_preference;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const updatedClient = await updateClientSettings(companyId, client.id, updates);

    return NextResponse.json({ success: true, client: updatedClient }, { status: 200 });
  } catch (error: any) {
    console.error("[Client Settings API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update client settings" }, { status: 500 });
  }
}
