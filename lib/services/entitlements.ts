import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCompanyById } from "@/lib/services/companies";
import { listClients } from "@/lib/services/clients";
import { coachingSlots, EntitlementError, validateCoachingSelection } from "@/lib/entitlements";
import type { Company } from "@/types/database";

export async function requireCoachingSlot(company: Company, clientId: string) {
  const current = await getCompanyById(company.id);
  if (!current) throw new EntitlementError("Workspace unavailable.", "WORKSPACE_UNAVAILABLE", 503);
  const slots = coachingSlots(current, await listClients(current.id));
  if (!slots.selectedIds.includes(clientId)) {
    throw new EntitlementError("Coaching is paused for this member. The coach can enable a coaching slot from Clients & Roster. Existing history is preserved.", "COACHING_PAUSED");
  }
  return current;
}

export async function saveCoachingSelection(company: Company, ids: unknown) {
  const selectedIds = validateCoachingSelection(company, await listClients(company.id), ids);
  const column = company.plan === "pro" ? "pro_client_ids" : "free_client_ids";
  // One atomic row update, bounded arrays, and a plan precondition prevent cap races.
  const { data, error } = await supabaseAdmin.from("companies")
    .update({ [column]: selectedIds }).eq("id", company.id).eq("plan", company.plan)
    .select("*").maybeSingle();
  if (error) throw new EntitlementError("Coaching slots could not be saved. Please try again or contact support.", "SELECTION_UNAVAILABLE", 503);
  if (!data) throw new EntitlementError("Your subscription changed. Refresh and select clients again.", "PLAN_CHANGED", 409);
  return data as Company;
}
