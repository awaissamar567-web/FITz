import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import { Plan, ExerciseItem, MacroTargets } from "@/types/database";

const globalWithPlans = globalThis as typeof globalThis & {
  __fitz_memory_plans?: Map<string, Plan>;
};
export const memoryPlans: Map<string, Plan> =
  globalWithPlans.__fitz_memory_plans ||
  (globalWithPlans.__fitz_memory_plans = new Map<string, Plan>());

function cMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  let cleanA = a;
  while (cleanA.startsWith("comp_") || cleanA.startsWith("biz_")) {
    cleanA = cleanA.replace(/^(comp_|biz_)/, "");
  }
  let cleanB = b;
  while (cleanB.startsWith("comp_") || cleanB.startsWith("biz_")) {
    cleanB = cleanB.replace(/^(comp_|biz_)/, "");
  }
  return cleanA === cleanB;
}

function clMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes("marcus") && b.includes("marcus")) return true;
  if (a.includes("sarah") && b.includes("sarah")) return true;
  if (a.includes("david") && b.includes("david")) return true;
  if (a.includes("emma") && b.includes("emma")) return true;
  if (a.includes("liam") && b.includes("liam")) return true;
  let cleanA = a;
  while (cleanA.startsWith("client_") || cleanA.startsWith("user_") || cleanA.startsWith("exp_")) {
    cleanA = cleanA.replace(/^(client_|user_|exp_)/, "");
  }
  let cleanB = b;
  while (cleanB.startsWith("client_") || cleanB.startsWith("user_") || cleanB.startsWith("exp_")) {
    cleanB = cleanB.replace(/^(client_|user_|exp_)/, "");
  }
  return cleanA === cleanB;
}

/**
 * Retrieves current plan for a client.
 * Scoped by (company_id, client_id).
 */
export async function getCurrentPlan(
  companyId: string,
  clientId: string
): Promise<Plan | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !isMockEnv) throw error;
    if (!error && data) {
      return data as Plan;
    }
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Plans] Remote getCurrentPlan failed, falling back to memory:", err);
  }

  // Fallback to local memory plan
  for (const plan of memoryPlans.values()) {
    const compMatches =
      plan.company_id === companyId ||
      cMatch(plan.company_id, companyId);
    const clientMatches =
      plan.client_id === clientId ||
      clMatch(plan.client_id, clientId);
    if (compMatches && clientMatches) {
      return plan;
    }
  }
  return null;
}

/** Load a tenant's plans once for dashboard aggregation. */
export async function listPlans(companyId: string): Promise<Plan[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });

    if (error && !isMockEnv) throw error;
    if (!error && data) return data as Plan[];
  } catch (error) {
    if (!isMockEnv) throw error;
  }

  const seen = new Set<string>();
  return Array.from(memoryPlans.values()).filter((plan) => {
    if (seen.has(plan.id) || !cMatch(plan.company_id, companyId)) return false;
    seen.add(plan.id);
    return true;
  });
}

/**
 * Creates or updates a plan for a client.
 * Scoped by (company_id, client_id).
 */
export async function savePlan(
  companyId: string,
  clientId: string,
  planData: {
    split_name: string;
    exercises: ExerciseItem[];
    macros: MacroTargets;
    schedule?: any[];
    pdf_url?: string | null;
  }
): Promise<Plan | null> {
  const updateFields: any = {
    split_name: planData.split_name,
    exercises: planData.exercises,
    macros: planData.macros,
    updated_at: new Date().toISOString(),
  };

  if (planData.schedule !== undefined) updateFields.schedule = planData.schedule;
  if (planData.pdf_url !== undefined) updateFields.pdf_url = planData.pdf_url;

  try {
    // Check if a plan already exists for this client
    const existing = await getCurrentPlan(companyId, clientId);

    if (existing && existing.id && !existing.id.startsWith("plan_sandbox_")) {
      const { data, error } = await supabaseAdmin
        .from("plans")
        .update(updateFields)
        .eq("id", existing.id)
        .eq("company_id", companyId)
        .select("*")
        .single();

      if (!error && data) {
        const saved = data as Plan;
        const key = `${companyId}:${clientId}`;
        memoryPlans.set(key, saved);
        memoryPlans.set(saved.id, saved);
        memoryPlans.set(`${companyId}:${saved.client_id}`, saved);
        return saved;
      }
    }

    // Otherwise insert new plan
    const { data, error } = await supabaseAdmin
      .from("plans")
      .insert({
        company_id: companyId,
        client_id: clientId,
        ...updateFields,
      })
      .select("*")
      .single();

    if (!error && data) {
      const saved = data as Plan;
      const key = `${companyId}:${clientId}`;
      memoryPlans.set(key, saved);
      memoryPlans.set(saved.id, saved);
      memoryPlans.set(`${companyId}:${saved.client_id}`, saved);
      return saved;
    }
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Plans] Remote savePlan failed, saving to memory fallback:", err);
  }

  // In-memory fallback
  const key = `${companyId}:${clientId}`;
  const mockPlan: Plan = {
    id: `plan_sandbox_${Date.now()}`,
    company_id: companyId,
    client_id: clientId,
    split_name: planData.split_name,
    exercises: planData.exercises,
    macros: planData.macros,
    schedule: planData.schedule || undefined,
    pdf_url: planData.pdf_url || undefined,
    updated_at: new Date().toISOString(),
  };

  memoryPlans.set(key, mockPlan);
  memoryPlans.set(mockPlan.id, mockPlan);
  memoryPlans.set(`${companyId}:${mockPlan.client_id}`, mockPlan);
  return mockPlan;
}
