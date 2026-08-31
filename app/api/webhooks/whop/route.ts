import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCompany } from "@/lib/services/companies";
import { createOrReactivateClient, deactivateClient } from "@/lib/services/clients";
import { updateCompanyPlan } from "@/lib/services/paywall";
import { checkoutCompany } from "@/lib/billing-checkout";

/**
 * Verifies Whop webhook signature using Standard Webhooks HMAC-SHA256 specification.
 * Supports {webhook-id}.{webhook-timestamp}.{rawBody} in base64 as well as direct hex payload hashes.
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookId: string | null,
  webhookTimestamp: string | null,
  secret: string
): boolean {
  if (!secret) {
    console.warn("[Webhook] WHOP_WEBHOOK_SECRET is not configured.");
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    // 1. Check timestamp freshness if present (prevent replay attacks > 5 minutes)
    if (webhookTimestamp) {
      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(webhookTimestamp, 10);
      if (!isNaN(ts) && Math.abs(now - ts) > 300) {
        console.warn("[Webhook] Timestamp expired (> 5 minutes).");
        return false;
      }
    }

    // Prepare candidate payloads to test
    const payloadsToTest = [
      webhookId && webhookTimestamp ? `${webhookId}.${webhookTimestamp}.${rawBody}` : null,
      rawBody,
    ].filter(Boolean) as string[];

    // Extract signature tokens (handles "v1,abc=" or "v1=abc" or "v1,abc v1,def")
    const receivedSignatures: string[] = signatureHeader
      .split(/[\s,]+/)
      .map((part) => (part.includes("=") && !part.endsWith("=") ? part.split("=")[1] : part))
      .filter((part) => part && part !== "v1");

    if (receivedSignatures.length === 0 && signatureHeader) {
      receivedSignatures.push(signatureHeader);
    }

    // Compute expected signatures
    for (const payload of payloadsToTest) {
      const hmacBase = crypto.createHmac("sha256", secret);
      const expectedBase64 = hmacBase.update(payload).digest("base64");

      const hmacHex = crypto.createHmac("sha256", secret);
      const expectedHex = hmacHex.update(payload).digest("hex");

      for (const received of receivedSignatures) {
        // Test base64 match
        if (
          expectedBase64.length === received.length &&
          crypto.timingSafeEqual(Buffer.from(expectedBase64), Buffer.from(received))
        ) {
          return true;
        }

        // Test hex match
        if (
          expectedHex.length === received.length &&
          crypto.timingSafeEqual(Buffer.from(expectedHex), Buffer.from(received))
        ) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("[Webhook] Signature verification error:", error);
    return false;
  }
}

const memoryWebhookEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const secret = process.env.WHOP_WEBHOOK_SECRET || "";

    let payload: any;
    const isTestBypass = process.env.NODE_ENV !== "production" && req.headers.get("x-test-webhook") === "true";
    if (isTestBypass) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    } else {
      if (!secret) {
        console.error("[Webhook] WHOP_WEBHOOK_SECRET is not configured");
        return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
      }
      try {
        payload = unwrapWebhook(rawBody, {
          headers: Object.fromEntries(req.headers.entries()),
          key: secret,
        });
      } catch {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const eventId = payload.id || payload.event_id || payload.data?.id;
    const eventType = payload.action || payload.event_type || payload.type || payload.event;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: "Missing event id or action type" }, { status: 400 });
    }

    // 1. Idempotency Check (SECURITY.md #5)
    if (memoryWebhookEvents.has(eventId)) {
      console.log(`[Webhook] Event ${eventId} was already processed (memory). Returning 200 OK.`);
      return NextResponse.json({ message: "Already processed (idempotent)" }, { status: 200 });
    }

    try {
      const { data: existingEvent, error: lookupError } = await supabaseAdmin
        .from("webhook_events")
        .select("id")
        .eq("whop_event_id", eventId)
        .maybeSingle();
      if (lookupError && !isMockEnv) throw lookupError;

      if (existingEvent) {
        memoryWebhookEvents.add(eventId);
        console.log(`[Webhook] Event ${eventId} was already processed. Returning 200 OK.`);
        return NextResponse.json({ message: "Already processed (idempotent)" }, { status: 200 });
      }
    } catch (err) {
      if (!isMockEnv) throw err;
      console.warn("[Webhook] Remote webhook_events lookup failed, checking memory:", err);
    }

    // Extract relevant data fields
    const data = payload.data || payload;
    let whopCompanyId =
      payload.company_id ||
      data.company_id ||
      data.company?.id ||
      data.business_id ||
      data.account_id;
    const whopUserId = data.user_id || data.member_id || data.user?.id;
    const whopExperienceId =
      data.experience_id ||
      data.metadata?.experience_id ||
      "exp_default";

    const whopPlanId = data.plan_id || data.plan?.id;
    const whopProductId = data.product_id || data.product?.id;

    const isFitzProSubscription = isMockEnv ? (
      data.is_app_subscription === true ||
      whopProductId === "fitz_pro" ||
      whopPlanId === "plan_fitz_pro" ||
      data.package_id === "fitz_pro" ||
      (Boolean(process.env.WHOP_PRO_PLAN_ID) &&
        (whopPlanId === process.env.WHOP_PRO_PLAN_ID ||
          whopProductId === process.env.WHOP_PRO_PLAN_ID)) ||
      (Boolean(process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID) &&
        whopProductId === process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID)
    ) : Boolean(process.env.WHOP_PRO_PLAN_ID && whopPlanId === process.env.WHOP_PRO_PLAN_ID);

    if (isFitzProSubscription && !isMockEnv) {
      // The event company is the seller. Only signed checkout metadata identifies
      // the purchasing workspace; never grant the seller Pro as a fallback.
      const target = checkoutCompany(data.metadata || data.membership?.metadata, whopPlanId);
      if (!target) {
        console.error("[Webhook] Pro payment is missing a verified workspace binding");
        return NextResponse.json({ error: "Pro checkout workspace could not be verified" }, { status: 422 });
      }
      whopCompanyId = target;
    }

    if (!whopCompanyId) {
      // Record event as received and acknowledge
      await supabaseAdmin.from("webhook_events").insert({
        whop_event_id: eventId,
        event_type: eventType,
        payload,
      });
      return NextResponse.json({ message: "Event ignored: missing company id" }, { status: 200 });
    }

    // Ensure company record exists
    const company = await getOrCreateCompany(whopCompanyId);
    if (!company) {
      return NextResponse.json({ error: "Failed to resolve company tenant" }, { status: 500 });
    }

    // 2. Handle Events
    if (isFitzProSubscription) {
      // Coach SaaS Upgrade / Downgrade for Fitz Pro Plan
      switch (eventType) {
        case "membership.activated":
        case "membership_went_valid":
        case "payment.succeeded": {
          console.log(`[Webhook] Upgrading company ${whopCompanyId} to Pro Tier`);
          await updateCompanyPlan(whopCompanyId, "pro");
          break;
        }

        case "membership.deactivated":
        case "membership_went_invalid":
        case "payment.failed": {
          console.log(`[Webhook] Downgrading company ${whopCompanyId} to Free Tier`);
          await updateCompanyPlan(whopCompanyId, "free");
          break;
        }
      }
    } else if (whopUserId) {
      // Client Coaching Product Membership
      switch (eventType) {
        case "membership.activated":
        case "membership_went_valid":
        case "payment.succeeded": {
          console.log(`[Webhook] Activating client ${whopUserId} for company ${company.id}`);
          await createOrReactivateClient(company.id, whopUserId, whopExperienceId);
          break;
        }

        case "membership.deactivated":
        case "membership_went_invalid":
        case "payment.failed": {
          console.log(`[Webhook] Deactivating client ${whopUserId} for company ${company.id}`);
          if (!await deactivateClient(company.id, whopUserId)) throw new Error("Membership deactivation did not persist");
          break;
        }
      }
    }

    // 3. Record in webhook_events table for permanent idempotency
    const { error: recordError } = await supabaseAdmin.from("webhook_events").insert({
      whop_event_id: eventId,
      event_type: eventType,
      payload,
    });
    if (recordError && recordError.code !== "23505") throw recordError;
    // Cache only successfully applied events so transient failures can be retried.
    memoryWebhookEvents.add(eventId);

    return NextResponse.json({ success: true, eventId, eventType }, { status: 200 });
  } catch (error) {
    console.error("[Webhook] Handler exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
