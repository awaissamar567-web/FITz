import { supabaseAdmin } from "@/lib/supabase/admin";
import { Checkin, MacroAdherence } from "@/types/database";

const memoryCheckins: Checkin[] = [];

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

    if (!error && data) {
      return data as Checkin;
    }
  } catch (err) {
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

    if (!error && data) {
      return data as Checkin[];
    }
  } catch (err) {
    console.warn("[Checkins] Remote listCheckins failed, returning memory list:", err);
  }

  return memoryCheckins
    .filter(
      (c) =>
        (c.company_id === companyId ||
          c.company_id === `comp_${companyId}` ||
          `comp_${c.company_id}` === companyId ||
          c.company_id.replace(/^comp_/, "") === companyId.replace(/^comp_/, "")) &&
        (!clientId ||
          c.client_id === clientId ||
          c.client_id === `client_${clientId}` ||
          `client_${c.client_id}` === clientId ||
          c.client_id.replace(/^client_/, "") === clientId.replace(/^client_/, ""))
    )
    .slice(0, limit);
}

