import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, evaluateWhopAccess } from "@/lib/whop-auth";
import { getClientByWhopUserId, createOrReactivateClient } from "@/lib/services/clients";
import { createCheckin, listCheckins } from "@/lib/services/checkins";
import { getOrCreateCompany } from "@/lib/services/companies";

/**
 * POST: Submit a new check-in
 */
export async function POST(req: NextRequest) {
  try {
    const headerList = await headers();
    const rawToken = headerList.get("x-whop-user-token") || headerList.get("authorization")?.replace("Bearer ", "");
    const testMockHeader = headerList.get("x-test-auth");
    const devUserId = headerList.get("x-dev-user-id");
    const userId = rawToken ? extractUserIdFromToken(rawToken) : devUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing user token" }, { status: 401 });
    }

    // Rate Limiting (SECURITY.md #6): 10 checkin submissions per minute
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const rateLimit = checkRateLimit(`checkin:${userId}`, { limit: 10, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many check-in attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetSeconds),
            "X-RateLimit-Limit": String(rateLimit.totalLimit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await req.json();
    const { experienceId, companyId, weight, photo_url, photoUrl, macro_hit, macroHit, notes, date } = body;
    const targetExpId = experienceId || companyId || "exp_default";
    const resolvedPhotoUrl = photo_url || photoUrl || null;
    const resolvedMacroHit = macro_hit || macroHit || {};

    if (!targetExpId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    // Verify member access
    const access = await evaluateWhopAccess(userId, targetExpId, testMockHeader);
    if (!access.has_access) {
      return NextResponse.json({ error: "Forbidden: Access denied to experience" }, { status: 403 });
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
    console.error("[Checkin POST API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET: Retrieve keyset-paginated check-ins for the authenticated client.
 * IDOR Prevention: If a targetClientId query param is supplied and differs from the authenticated client, returns 403 Forbidden.
 */
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
    const experienceId = searchParams.get("experienceId") || "exp_default";
    const companyId = searchParams.get("companyId") || "biz_default_coach";
    const targetClientId = searchParams.get("clientId");
    const beforeDate = searchParams.get("beforeDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Verify member access
    const access = await evaluateWhopAccess(userId, experienceId, testMockHeader);
    if (!access.has_access) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

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
    console.error("[Checkin GET API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
