import { supabaseAdmin } from "@/lib/supabase/admin";
import { Plan, ExerciseItem, MacroTargets } from "@/types/database";

const memoryPlans = new Map<string, Plan>();

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

    if (!error && data) {
      return data as Plan;
    }
  } catch (err) {
    console.warn("[Plans] Remote getCurrentPlan failed, falling back to memory:", err);
  }

  // Fallback to local memory plan
  const key = `${companyId}:${clientId}`;
  return memoryPlans.get(key) || null;
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
        return data as Plan;
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
      return data as Plan;
    }
  } catch (err) {
    console.warn("[Plans] Remote savePlan failed, saving to memory fallback:", err);
  }

  // In-memory fallback
  const key = `${companyId}:${clientId}`;
  const mockPlan: Plan = {
    id: `plan_sandbox_${clientId}`,
    company_id: companyId,
    client_id: clientId,
    split_name: planData.split_name,
    exercises: planData.exercises,
    macros: planData.macros,
    schedule: planData.schedule,
    pdf_url: planData.pdf_url || undefined,
    updated_at: new Date().toISOString(),
  };

  memoryPlans.set(key, mockPlan);
  return mockPlan;
}

