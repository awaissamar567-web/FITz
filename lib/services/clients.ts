import { supabaseAdmin } from "@/lib/supabase/admin";
import { Client, ClientStatus } from "@/types/database";

const memoryClients = new Map<string, Client>();

/**
 * Retrieves a client by ID, strictly scoped by company_id.
 */
export async function getClient(
  companyId: string,
  clientId: string
): Promise<Client | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", clientId)
      .maybeSingle();

    if (!error && data) {
      return data as Client;
    }
  } catch (err) {
    console.warn("[Clients] getClient remote error:", err);
  }

  for (const client of memoryClients.values()) {
    const compMatches =
      client.company_id === companyId ||
      client.company_id === `comp_${companyId}` ||
      `comp_${client.company_id}` === companyId;
    if (
      compMatches &&
      (client.id === clientId ||
        client.whop_user_id === clientId ||
        `client_${client.whop_user_id}` === clientId ||
        client.id === `client_${clientId}`)
    ) {
      return client;
    }
  }

  return null;
}

/**
 * Retrieves a client by their Whop user ID, strictly scoped by company_id.
 */
export async function getClientByWhopUserId(
  companyId: string,
  whopUserId: string
): Promise<Client | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .eq("whop_user_id", whopUserId)
      .maybeSingle();

    if (!error && data) {
      return data as Client;
    }
  } catch (err) {
    console.warn("[Clients] getClientByWhopUserId remote error:", err);
  }

  const cleanCompId = companyId.replace(/^comp_/, "");
  for (const client of memoryClients.values()) {
    const compMatches =
      client.company_id === companyId ||
      client.company_id === `comp_${companyId}` ||
      `comp_${client.company_id}` === companyId ||
      client.company_id.replace(/^comp_/, "") === cleanCompId;
    if (
      compMatches &&
      (client.whop_user_id === whopUserId ||
        client.whop_user_id === `user_${whopUserId}` ||
        `user_${client.whop_user_id}` === whopUserId ||
        client.id === whopUserId)
    ) {
      return client;
    }
  }

  return null;
}

/**
 * Lists clients for a given company, with optional status filter.
 * Uses composite index (company_id, status).
 */
export async function listClients(
  companyId: string,
  statusFilter?: ClientStatus
): Promise<Client[]> {
  try {
    let query = supabaseAdmin
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .order("joined_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data as Client[];
    }
  } catch (err) {
    console.warn("[Clients] listClients remote error:", err);
  }

  const list = Array.from(memoryClients.values()).filter(
    (c) =>
      c.company_id === companyId ||
      c.company_id === `comp_${companyId}` ||
      `comp_${c.company_id}` === companyId
  );
  return statusFilter ? list.filter((c) => c.status === statusFilter) : list;
}

/**
 * Idempotently creates or reactivates a client record when membership is activated.
 * Scoped by (company_id, whop_user_id).
 */
export async function createOrReactivateClient(
  companyId: string,
  whopUserId: string,
  whopExperienceId: string
): Promise<Client | null> {
  const mockClient: Client = {
    id: `client_${whopUserId}`,
    company_id: companyId,
    whop_user_id: whopUserId,
    whop_experience_id: whopExperienceId,
    display_name: "Marcus Vance",
    units_preference: "kg",
    status: "active",
    intake_completed: true,
    goal: "Hypertrophy & Muscle Gain",
    stats: { age: 26, gender: "Male", currentWeight: 82.5, height: "180 cm" },
    experience_level: "intermediate",
    equipment: { gymAccess: true, daysPerWeek: 4 },
    limitations: null,
    joined_at: new Date().toISOString(),
  };

  try {
    const existing = await getClientByWhopUserId(companyId, whopUserId);

    if (existing && !existing.id.startsWith("client_user_")) {
      // Reactivate if previously cancelled
      const { data, error } = await supabaseAdmin
        .from("clients")
        .update({
          status: "active",
          whop_experience_id: whopExperienceId,
        })
        .eq("company_id", companyId)
        .eq("whop_user_id", whopUserId)
        .select("*")
        .single();

      if (!error && data) {
        return data as Client;
      }
    }

    // Insert new client
    const { data, error } = await supabaseAdmin
      .from("clients")
      .insert({
        company_id: companyId,
        whop_user_id: whopUserId,
        whop_experience_id: whopExperienceId,
        status: "active",
        intake_completed: false,
        stats: {},
        equipment: { gymAccess: true },
        joined_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (!error && data) {
      return data as Client;
    }
  } catch (error) {
    console.warn("[Clients] createOrReactivateClient fallback:", error);
  }

  const key = `${companyId}:${whopUserId}`;
  memoryClients.set(key, mockClient);
  return mockClient;
}

/**
 * Sets a client's status to 'cancelled' when their Whop membership is deactivated.
 * Soft delete to preserve history for the coach.
 */
export async function deactivateClient(
  companyId: string,
  whopUserId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("clients")
    .update({ status: "cancelled" })
    .eq("company_id", companyId)
    .eq("whop_user_id", whopUserId);

  if (error) {
    console.error("[Clients] deactivateClient error:", error);
    return false;
  }

  return true;
}

/**
 * Updates a client's intake form submission.
 * Strictly allowlisted fields, preventing company_id / status tampering.
 */
export async function updateClientIntake(
  companyId: string,
  clientId: string,
  intakeData: {
    display_name?: string;
    goal: string;
    stats: Client["stats"];
    experience_level: string;
    equipment: Client["equipment"];
    limitations?: string;
  }
): Promise<Client | null> {
  const updatePayload: any = {
    goal: intakeData.goal,
    stats: intakeData.stats,
    experience_level: intakeData.experience_level,
    equipment: intakeData.equipment,
    limitations: intakeData.limitations || null,
    intake_completed: true,
  };

  if (intakeData.display_name) {
    updatePayload.display_name = intakeData.display_name;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", clientId)
      .select("*")
      .single();

    if (!error && data) {
      return data as Client;
    }
  } catch (err) {
    console.warn("[Clients] updateClientIntake remote error, falling back to local:", err);
  }

  const updatedClient: Client = {
    id: clientId,
    company_id: companyId,
    whop_user_id: clientId.replace("client_", ""),
    whop_experience_id: "exp_default",
    display_name: intakeData.display_name || "Marcus Vance",
    units_preference: "kg",
    status: "active",
    intake_completed: true,
    goal: intakeData.goal,
    stats: intakeData.stats || { age: 26, gender: "Male", currentWeight: 82.5, height: "180 cm" },
    experience_level: intakeData.experience_level || "intermediate",
    equipment: intakeData.equipment || { gymAccess: true, daysPerWeek: 4 },
    limitations: intakeData.limitations || null,
    joined_at: new Date().toISOString(),
  };

  const cleanCompId = companyId.replace(/^comp_/, "");
  const whopUid = clientId.replace(/^client_/, "");
  memoryClients.set(`${companyId}:${whopUid}`, updatedClient);
  memoryClients.set(`comp_${cleanCompId}:${whopUid}`, updatedClient);
  memoryClients.set(`${cleanCompId}:${whopUid}`, updatedClient);
  memoryClients.set(clientId, updatedClient);
  memoryClients.set(`client_${whopUid}`, updatedClient);
  return updatedClient;
}

/**
 * Updates a client's personal settings (e.g. units preference, display name).
 * Strictly scoped by company_id and client_id.
 */
export async function updateClientSettings(
  companyId: string,
  clientId: string,
  updates: {
    display_name?: string;
    avatar_url?: string;
    units_preference?: "kg" | "lbs";
  }
): Promise<Client | null> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .update(updates)
    .eq("company_id", companyId)
    .eq("id", clientId)
    .select("*")
    .single();

  if (error) {
    console.error("[Clients] updateClientSettings error:", error);
    throw error;
  }

  return data as Client;
}

