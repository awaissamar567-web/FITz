import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";

import type { Company } from "@/types/database";
export type { Company } from "@/types/database";

const memoryCompanies = new Map<string, Company>();

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data as Company | null) || null;
}

/**
 * Retrieves existing company or provisions a new record for a newly installed coach.
 * Guaranteed to be scoped to the authenticated whop_company_id.
 */
export async function getOrCreateCompany(
  whopCompanyId: string,
  coachName?: string
): Promise<Company | null> {
  if (!whopCompanyId) return null;

  // Client-facing APIs receive the internal company UUID stored on the client
  // record. Resolve it directly instead of treating it as a new Whop biz ID.
  const isInternalCompanyId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      whopCompanyId
    );
  if (isInternalCompanyId) {
    return getCompanyById(whopCompanyId);
  }

  try {
    // 1. Try to fetch existing
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("whop_company_id", whopCompanyId)
      .maybeSingle();

    if (fetchError && !isMockEnv) throw fetchError;
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

    if (insertError && !isMockEnv) throw insertError;
    if (!insertError && created) {
      return created as Company;
    }
  } catch (error) {
    if (!isMockEnv) throw error;
    console.warn("[Companies] Remote company provision failed, using memory fallback:", error);
  }

  if (memoryCompanies.has(whopCompanyId)) {
    return memoryCompanies.get(whopCompanyId)!;
  }

  const fallback: Company = {
    id: `comp_${whopCompanyId}`,
    whop_company_id: whopCompanyId,
    coach_name: coachName || "Coach",
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
  updates: Partial<Pick<Company, "coach_name" | "default_checkin_frequency" | "units" | "at_risk_threshold_days" | "avatar_url" | "coach_years_experience" | "coach_expertise" | "coach_avatar_path" | "coach_onboarded_at">>
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
