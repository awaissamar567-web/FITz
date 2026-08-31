import { createHmac, timingSafeEqual } from "node:crypto";

const companyPattern = /^biz_[a-zA-Z0-9_]+$/;

function sign(companyId: string, planId: string) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) throw new Error("Billing webhook secret is not configured");
  return createHmac("sha256", secret).update(`fitz-checkout:v1:${companyId}:${planId}`).digest("hex");
}

/** Bind a checkout to an already authorized coach workspace, not the seller. */
export function checkoutMetadata(companyId: string, planId: string) {
  if (!companyPattern.test(companyId) || !/^plan_[a-zA-Z0-9_]+$/.test(planId)) throw new Error("Invalid checkout configuration");
  return { fitz_company_id: companyId, fitz_plan_id: planId, fitz_checkout_signature: sign(companyId, planId) };
}

export function checkoutCompany(metadata: Record<string, unknown> | null | undefined, planId: string): string | null {
  const companyId = metadata?.fitz_company_id;
  const signature = metadata?.fitz_checkout_signature;
  if (typeof companyId !== "string" || !companyPattern.test(companyId) || metadata?.fitz_plan_id !== planId || typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = sign(companyId, planId);
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")) ? companyId : null;
}
