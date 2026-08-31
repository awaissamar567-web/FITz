import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import { Client, ClientStatus } from "@/types/database";

const globalWithClients = globalThis as typeof globalThis & {
  __fitz_memory_clients?: Map<string, Client>;
};
export const memoryClients: Map<string, Client> =
  globalWithClients.__fitz_memory_clients ||
  (globalWithClients.__fitz_memory_clients = new Map<string, Client>());

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
  let cleanA = a;
  while (cleanA.startsWith("client_") || cleanA.startsWith("user_")) {
    cleanA = cleanA.replace(/^(client_|user_)/, "");
  }
  let cleanB = b;
  while (cleanB.startsWith("client_") || cleanB.startsWith("user_")) {
    cleanB = cleanB.replace(/^(client_|user_)/, "");
  }
  return cleanA === cleanB;
}

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

    if (error && !isMockEnv) throw error;
    if (!error && data) {
      return data as Client;
    }
    if (!isMockEnv) return null;
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Clients] getClient remote error:", err);
  }

  for (const client of memoryClients.values()) {
    const compMatches =
      client.company_id === companyId ||
      cMatch(client.company_id, companyId);
    if (
      compMatches &&
      (client.id === clientId ||
        client.whop_user_id === clientId ||
        clMatch(client.id, clientId) ||
        clMatch(client.whop_user_id, clientId))
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

    if (error && !isMockEnv) throw error;
    if (!error && data) {
      return data as Client;
    }

    if (!isMockEnv) return null;
    // Offline fixture fallback only: check by whop_experience_id
    const { data: expData, error: expErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .eq("whop_experience_id", whopUserId)
      .maybeSingle();

    if (expErr && !isMockEnv) throw expErr;
    if (!expErr && expData) {
      return expData as Client;
    }
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Clients] getClientByWhopUserId remote error:", err);
  }

  for (const client of memoryClients.values()) {
    const compMatches =
      client.company_id === companyId ||
      cMatch(client.company_id, companyId);
    if (
      compMatches &&
      (client.whop_user_id === whopUserId ||
        client.id === whopUserId ||
        client.whop_experience_id === whopUserId ||
        clMatch(client.whop_user_id, whopUserId) ||
        clMatch(client.id, whopUserId) ||
        clMatch(client.whop_experience_id, whopUserId))
    ) {
      return client;
    }
  }

  return null;
}

/** Resolve a member's tenant from webhook-provisioned Whop identifiers. */
export async function getClientByExperienceAndUser(
  experienceId: string,
  whopUserId: string
): Promise<Client | null> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("whop_experience_id", experienceId)
    .eq("whop_user_id", whopUserId)
    .maybeSingle();

  if (error) throw error;
  return (data as Client | null) || null;
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

    if (error && !isMockEnv) throw error;
    if (!error && data && data.length > 0) {
      return data as Client[];
    }
    if (!isMockEnv) return [];
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Clients] listClients remote error:", err);
  }

  const seenIds = new Set<string>();
  const list = Array.from(memoryClients.values()).filter(
    (c) => {
      if (seenIds.has(c.id)) return false;
      const matchesCompany =
        c.company_id === companyId ||
        cMatch(c.company_id, companyId);
      if (matchesCompany) {
        seenIds.add(c.id);
        return true;
      }
      return false;
    }
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
    display_name: null,
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
      if (!isMockEnv) throw error || new Error("Client reactivation did not persist");
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
      const saved = data as Client;
      memoryClients.set(saved.id, saved);
      memoryClients.set(`${companyId}:${whopUserId}`, saved);
      memoryClients.set(`${companyId}:${saved.id}`, saved);
      return saved;
    }
  } catch (error) {
    if (!isMockEnv) throw error;
    console.warn("[Clients] createOrReactivateClient fallback:", error);
  }

  if (!isMockEnv) {
    const concurrent = await getClientByWhopUserId(companyId, whopUserId);
    if (concurrent) return concurrent;
    throw new Error("Client could not be saved");
  }
  const key = `${companyId}:${whopUserId}`;
  memoryClients.set(key, mockClient);
  memoryClients.set(mockClient.id, mockClient);
  memoryClients.set(`${companyId}:${mockClient.id}`, mockClient);
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
      const saved = data as Client;
      memoryClients.set(saved.id, saved);
      memoryClients.set(clientId, saved);
      memoryClients.set(`${companyId}:${saved.whop_user_id}`, saved);
      return saved;
    }
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Clients] updateClientIntake remote error, falling back to local:", err);
  }

  if (!isMockEnv) throw new Error("Intake could not be saved");
  const updatedClient: Client = {
    id: clientId,
    company_id: companyId,
    whop_user_id: clientId.replace("client_", ""),
    whop_experience_id: "exp_default",
    display_name: intakeData.display_name || null,
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
