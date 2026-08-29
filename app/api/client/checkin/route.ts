import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getClientByWhopUserId, createOrReactivateClient } from "@/lib/services/clients";
import { createCheckin, listCheckins } from "@/lib/services/checkins";
import { getOrCreateCompany } from "@/lib/services/companies";

/**
 * POST: Submit a new check-in
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experienceId, companyId, weight, photo_url, photoUrl, macro_hit, macroHit, notes, date } = body;
    const targetExpId = experienceId || companyId || "exp_default";
    const resolvedPhotoUrl = photo_url || photoUrl || null;
    const resolvedMacroHit = macro_hit || macroHit || {};

    if (!targetExpId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    const auth = await requireClientAccess(targetExpId, isDemo);
    const userId = auth.userId;

    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const rateLimit = checkRateLimit(`checkin:${userId}`, { limit: 10, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many check-in attempts. Please try again shortly." }, {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetSeconds) },
      });
    }

    // Resolve company
    const targetCompanyId = companyId || "biz_default_coach";
    const company = await getOrCreateCompany(targetCompanyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Resolve client
    let client = await getClientByWhopUserId(company.id, userId);
    if (!client) {
      client = await createOrReactivateClient(company.id, userId, experienceId);
    }

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Create checkin with explicit company_id and client_id binding
    const checkin = await createCheckin(company.id, client.id, {
      weight: weight ? parseFloat(weight) : undefined,
      photo_url: resolvedPhotoUrl || undefined,
      macro_hit: resolvedMacroHit,
      notes,
      date,
    });

    // If client was flagged at_risk, auto-recover to active
    if (client.status === "at_risk") {
      const { supabaseAdmin } = await import("@/lib/supabase/admin");
      await supabaseAdmin
        .from("clients")
        .update({ status: "active" })
        .eq("id", client.id)
        .eq("company_id", company.id);
    }

    return NextResponse.json({ success: true, checkin }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "[Checkin POST API]");
  }
}

/**
 * GET: Retrieve keyset-paginated check-ins for the authenticated client.
 * IDOR Prevention: If a targetClientId query param is supplied and differs from the authenticated client, returns 403 Forbidden.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId") || "exp_default";
    const companyId = searchParams.get("companyId") || "biz_default_coach";
    const targetClientId = searchParams.get("clientId");
    const beforeDate = searchParams.get("beforeDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const isDemo = process.env.NODE_ENV !== "production" && searchParams.get("demo") === "true";
    const auth = await requireClientAccess(experienceId, isDemo);
    const userId = auth.userId;

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const client = await getClientByWhopUserId(company.id, userId);
    if (!client) {
      return NextResponse.json({ checkins: [] }, { status: 200 });
    }

    // IDOR Protection: Prevent client A from querying client B's ID
    if (targetClientId && targetClientId !== client.id && targetClientId !== client.whop_user_id) {
      console.warn(`[Security Alert] IDOR attempt blocked: User ${userId} tried to access client ${targetClientId}`);
      return NextResponse.json({ error: "Forbidden: IDOR boundary violation" }, { status: 403 });
    }

    const checkins = await listCheckins(company.id, client.id, limit, beforeDate);

    return NextResponse.json({ checkins }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "[Checkin GET API]");
  }
}
