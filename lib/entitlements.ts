import { clientCapacity } from "@/lib/constants/plans";
import type { Client, Company } from "@/types/database";

export class EntitlementError extends Error {
  constructor(message: string, public code = "PRO_REQUIRED", public status = 402) {
    super(message);
    this.name = "EntitlementError";
  }
}

export function requirePro(company: Pick<Company, "plan">, feature: string) {
  if (company.plan !== "pro") throw new EntitlementError(`${feature} requires FITz Pro.`);
}

/** Membership and coaching capacity are separate: never delete a member to free a slot. */
export function coachingSlots(company: Company, clients: Client[]) {
  const limit = clientCapacity(company.plan);
  const eligible = clients.filter(c => c.company_id === company.id &&
    (c.status === "active" || c.status === "at_risk"));
  const configured = company.plan === "pro" ? company.pro_client_ids : company.free_client_ids;
  // Stable, oldest-first defaults preserve existing coaching when new members arrive.
  // A saved empty array intentionally pauses everyone; it must not auto-fill.
  const candidates = configured ?? [...eligible]
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at) || a.id.localeCompare(b.id))
    .map(c => c.id);
  const eligibleIds = new Set(eligible.map(c => c.id));
  const selectedIds = [...new Set(candidates)].filter(id => eligibleIds.has(id)).slice(0, limit);
  return { limit, selectedIds, activeCount: selectedIds.length, eligibleCount: eligible.length,
    waitingCount: eligible.length - selectedIds.length, automatic: configured == null };
}

export function validateCoachingSelection(company: Company, clients: Client[], ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length) {
    throw new EntitlementError("Choose a unique list of clients.", "INVALID_SELECTION", 400);
  }
  if (ids.length > clientCapacity(company.plan)) {
    throw new EntitlementError(`Your ${company.plan === "pro" ? "Pro" : "Free"} plan supports up to ${clientCapacity(company.plan)} coaching clients.`, "CAPACITY_REACHED");
  }
  const eligible = new Set(clients.filter(c => c.company_id === company.id &&
    (c.status === "active" || c.status === "at_risk")).map(c => c.id));
  if (ids.some(id => !eligible.has(id))) {
    throw new EntitlementError("Select only active members of this workspace.", "INVALID_SELECTION", 400);
  }
  return ids;
}
