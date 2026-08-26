import { supabaseAdmin } from "@/lib/supabase/admin";
import { Company } from "@/types/database";
import { listClients } from "@/lib/services/clients";

export const FREE_TIER_CLIENT_LIMIT = 5;

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
  if (company.plan === "pro") {
    const clients = await listClients(company.id);
    const activeCount = clients.filter((c) => c.status === "active" || c.status === "at_risk").length;
    return {
      isCapped: false,
      plan: "pro",
      activeCount,
      limit: Infinity,
      canAddClient: true,
    };
  }

  const clients = await listClients(company.id);
  const activeCount = clients.filter((c) => c.status === "active" || c.status === "at_risk").length;
  const isCapped = activeCount >= FREE_TIER_CLIENT_LIMIT;

  return {
    isCapped,
    plan: "free",
    activeCount,
    limit: FREE_TIER_CLIENT_LIMIT,
    canAddClient: !isCapped,
  };
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
  } catch (err) {
    console.warn("[Paywall] Remote updateCompanyPlan error, using fallback:", err);
  }

  const { getOrCreateCompany } = await import("@/lib/services/companies");
  const comp = await getOrCreateCompany(whopCompanyId);
  if (comp) {
    comp.plan = plan;
  }
  return comp;
}
