import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import { Company } from "@/types/database";
import { listClients } from "@/lib/services/clients";
import { coachingSlots } from "@/lib/entitlements";

export interface PaywallStatus {
  isCapped: boolean;
  plan: "free" | "pro";
  activeCount: number;
  limit: number;
  canAddClient: boolean;
}

/**
 * Checks whether a company has reached its active client capacity on its current plan tier.
 */
export async function checkPaywallStatus(company: Company): Promise<PaywallStatus> {
  const slots = coachingSlots(company, await listClients(company.id));
  return { ...slots, plan: company.plan, isCapped: slots.activeCount >= slots.limit,
    canAddClient: slots.activeCount < slots.limit };
}

/**
 * Flips a company's subscription tier.
 */
export async function updateCompanyPlan(
  whopCompanyId: string,
  plan: "free" | "pro"
): Promise<Company | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .update({ plan })
      .eq("whop_company_id", whopCompanyId)
      .select("*")
      .single();

    if (!error && data) {
      return data as Company;
    }
    if (!isMockEnv) throw error || new Error("Subscription update did not persist");
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Paywall] Remote updateCompanyPlan error, using fallback:", err);
  }

  const { getOrCreateCompany } = await import("@/lib/services/companies");
  const comp = await getOrCreateCompany(whopCompanyId);
  if (comp) {
    comp.plan = plan;
  }
  return comp;
}
