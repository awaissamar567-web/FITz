import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { whopsdk } from "@/lib/whop-sdk";
import { checkoutMetadata } from "@/lib/billing-checkout";
import { isMockEnv } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getOrCreateCompany } from "@/lib/services/companies";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId || !/^biz_[a-zA-Z0-9_]+$/.test(companyId)) return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
    const auth = await requireCoachAccess(companyId);
    const rate = checkRateLimit(`checkout:${companyId}:${auth.userId}`, { limit: 6, windowSeconds: 60 });
    if (!rate.allowed) return NextResponse.json({ error: "Please wait a moment before opening checkout again." }, { status: 429 });
    const company = await getOrCreateCompany(companyId);
    if (!company) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (company.plan === "pro") return NextResponse.json({ error: "This workspace already has Pro. Refresh your dashboard." }, { status: 409 });
    // Local previews must never start real payments or silently simulate success.
    if (isMockEnv) return NextResponse.json({ error: "Checkout is disabled in this local preview. Your Free workspace still works; test payment inside the live Whop app." }, { status: 503 });
    const planId = process.env.WHOP_PRO_PLAN_ID;
    const appId = process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID;
    if (!planId || !/^plan_[a-zA-Z0-9]+$/.test(planId) || !appId || !/^app_[a-zA-Z0-9]+$/.test(appId) || !process.env.WHOP_WEBHOOK_SECRET) return NextResponse.json({ error: "Checkout is not configured. Please contact support." }, { status: 503 });
    const returnUrl = `https://whop.com/dashboard/${companyId}/apps/${appId}/`;
    try {
      // Use only the existing plan. Never accept price, plan or metadata from the browser.
      const checkout = await whopsdk.checkoutConfigurations.create({
        plan_id: planId, mode: "payment", redirect_url: returnUrl,
        metadata: checkoutMetadata(companyId, planId),
      });
      if (!checkout.id) throw new Error("Checkout configuration has no ID");
      return NextResponse.json({ sessionId: checkout.id, planId, returnUrl }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      // Do not serialize SDK errors: they may include request credentials.
      console.error("[Checkout] Whop checkout configuration creation failed");
      return NextResponse.json({ error: "Whop checkout could not be opened. Please try again or contact support." }, { status: 502 });
    }
  } catch (error) { return apiErrorResponse(error, "[Checkout]"); }
}
