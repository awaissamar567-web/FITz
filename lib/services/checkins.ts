import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import { Checkin, MacroAdherence } from "@/types/database";

const globalWithCheckins = globalThis as typeof globalThis & {
  __fitz_memory_checkins?: Checkin[];
};
export const memoryCheckins: Checkin[] =
  globalWithCheckins.__fitz_memory_checkins ||
  (globalWithCheckins.__fitz_memory_checkins = []);

async function withSignedPhotoUrls(checkins: Checkin[]): Promise<Checkin[]> {
  if (isMockEnv) return checkins;
  return Promise.all(checkins.map(async (checkin) => {
    if (!checkin.photo_url || /^https?:\/\//i.test(checkin.photo_url)) return checkin;
    const { data, error } = await supabaseAdmin.storage
      .from("checkin-photos")
      .createSignedUrl(checkin.photo_url, 60 * 60);
    return error ? { ...checkin, photo_url: null } : { ...checkin, photo_url: data.signedUrl };
  }));
}

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
 * Creates a check-in record.
 * Both company_id and client_id are explicitly recorded (denormalized company_id).
 */
export async function createCheckin(
  companyId: string,
  clientId: string,
  checkinData: {
    weight?: number;
    photo_url?: string;
    macro_hit?: MacroAdherence;
    notes?: string;
    date?: string;
  }
): Promise<Checkin | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("checkins")
      .insert({
        company_id: companyId,
        client_id: clientId,
        weight: checkinData.weight || null,
        photo_url: checkinData.photo_url || null,
        macro_hit: checkinData.macro_hit || {},
        notes: checkinData.notes || null,
        date: checkinData.date || new Date().toISOString().split("T")[0],
      })
      .select("*")
      .single();

    if (error && !isMockEnv) throw error;
    if (!error && data) {
      const saved = data as Checkin;
      memoryCheckins.unshift(saved);
      return saved;
    }
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Checkins] Remote createCheckin failed, using memory fallback:", err);
  }

  const mockCheckin: Checkin = {
    id: `chk_sandbox_${Date.now()}`,
    company_id: companyId,
    client_id: clientId,
    weight: checkinData.weight || 82.5,
    photo_url: checkinData.photo_url || null,
    macro_hit: checkinData.macro_hit || { hitTarget: true, calories: 2400, protein: 180, carbs: 220, fat: 65 },
    notes: checkinData.notes || null,
    date: checkinData.date || new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
  };

  memoryCheckins.unshift(mockCheckin);
  return mockCheckin;
}

/**
 * Lists check-ins for a client with keyset pagination (date/created_at desc).
 * Scoped by (company_id, client_id).
 */
export async function listCheckins(
  companyId: string,
  clientId?: string,
  limit: number = 20,
  beforeDate?: string
): Promise<Checkin[]> {
  try {
    let query = supabaseAdmin
      .from("checkins")
      .select("*")
      .eq("company_id", companyId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (beforeDate) {
      query = query.lt("date", beforeDate);
    }

    const { data, error } = await query;

    if (error && !isMockEnv) throw error;
    if (!error && data && data.length > 0) {
      return withSignedPhotoUrls(data as Checkin[]);
    }
    if (!isMockEnv) return [];
  } catch (err) {
    if (!isMockEnv) throw err;
    console.warn("[Checkins] Remote listCheckins failed, returning memory list:", err);
  }

  const seenIds = new Set<string>();
  return memoryCheckins
    .filter((c) => {
      if (seenIds.has(c.id)) return false;
      const compMatch =
        c.company_id === companyId ||
        cMatch(c.company_id, companyId);
      const cliMatch =
        !clientId ||
        c.client_id === clientId ||
        clMatch(c.client_id, clientId);
      if (compMatch && cliMatch) {
        seenIds.add(c.id);
        return true;
      }
      return false;
    })
    .slice(0, limit);
}
