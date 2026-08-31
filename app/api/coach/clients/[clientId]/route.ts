import { NextRequest, NextResponse } from "next/server";
import { coachingSlots } from "@/lib/entitlements";
import { listClients } from "@/lib/services/clients";
import { requireCoachAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
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
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId parameter" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && searchParams.get("demo") === "true";
    await requireCoachAccess(companyId, isDemo);

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

    const slots = coachingSlots(company, await listClients(company.id));
    return NextResponse.json({ client, checkins, plan, isPro: company.plan === "pro", coachingEnabled: slots.selectedIds.includes(client.id) }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "[Coach Single Client API]");
  }
}
