import { supabaseAdmin } from "@/lib/supabase/admin";

export interface Company {
  id: string;
  whop_company_id: string;
  coach_name: string | null;
  default_checkin_frequency: "daily" | "weekly";
  units: "kg" | "lbs";
  at_risk_threshold_days?: number;
  avatar_url?: string | null;
  plan: "free" | "pro";
  created_at: string;
}

const memoryCompanies = new Map<string, Company>();

/**
 * Retrieves existing company or provisions a new record for a newly installed coach.
 * Guaranteed to be scoped to the authenticated whop_company_id.
 */
export async function getOrCreateCompany(
  whopCompanyId: string,
  coachName?: string
): Promise<Company | null> {
  if (!whopCompanyId) return null;

  try {
    // 1. Try to fetch existing
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("whop_company_id", whopCompanyId)
      .maybeSingle();

    if (existing) {
      return existing as Company;
    }

    // 2. If not found, provision new company record
    const { data: created, error: insertError } = await supabaseAdmin
      .from("companies")
      .insert({
        whop_company_id: whopCompanyId,
        coach_name: coachName || null,
        default_checkin_frequency: "weekly",
        units: "kg",
        at_risk_threshold_days: 7,
        plan: "free",
      })
      .select("*")
      .single();

    if (!insertError && created) {
      return created as Company;
    }
  } catch (error) {
    console.warn("[Companies] Remote company provision failed, using memory fallback:", error);
  }

  if (memoryCompanies.has(whopCompanyId)) {
    return memoryCompanies.get(whopCompanyId)!;
  }

  const fallback: Company = {
    id: `comp_${whopCompanyId}`,
    whop_company_id: whopCompanyId,
    coach_name: coachName || (whopCompanyId.includes("alex") ? "Coach Alex Rivera" : "Head Coach"),
    default_checkin_frequency: "weekly",
    units: "kg",
    at_risk_threshold_days: 7,
    plan: "free",
    created_at: new Date().toISOString(),
  };

  memoryCompanies.set(whopCompanyId, fallback);
  return fallback;
}

/**
 * Updates company profile settings (e.g. check-in frequency, units, coach name, at_risk_threshold_days).
 * Strictly scoped by whop_company_id.
 */
export async function updateCompanySettings(
  whopCompanyId: string,
  updates: Partial<Pick<Company, "coach_name" | "default_checkin_frequency" | "units" | "at_risk_threshold_days" | "avatar_url">>
): Promise<Company | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(updates)
    .eq("whop_company_id", whopCompanyId)
    .select("*")
    .single();

  if (error) {
    console.error("[Companies] Failed to update company settings:", error);
    throw error;
  }

  return data as Company;
}
