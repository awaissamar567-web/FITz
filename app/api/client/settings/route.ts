import { NextRequest, NextResponse } from "next/server";
import { memberContext } from "@/lib/member-context";
import { apiErrorResponse } from "@/lib/api-errors";
import { updateClientSettings } from "@/lib/services/clients";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, clientId, experienceId, display_name, units_preference, avatar_url } = body;

    if (!companyId || !experienceId) {
      return NextResponse.json({ error: "Missing companyId or experienceId" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    const { company, client } = await memberContext(experienceId, companyId, isDemo);

    const updates: any = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (units_preference !== undefined) updates.units_preference = units_preference;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const updatedClient = await updateClientSettings(company.id, client.id, updates);

    return NextResponse.json({ success: true, client: updatedClient }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "[Client Settings API]");
  }
}
