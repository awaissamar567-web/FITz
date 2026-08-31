import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import type { Company } from "@/types/database";

export const COACH_AVATAR_BUCKET = "coach-avatars";

// Call only after the viewer's company access has been authorized.
export async function withCoachAvatar(company: Company): Promise<Company> {
  const path = company.coach_avatar_path;
  if (!path || !path.startsWith(`${company.id}/`) || path.includes("..")) return { ...company, avatar_url: null };
  if (isMockEnv) return { ...company, avatar_url: "/brand/fitz_logo.png" };
  try {
    const { data, error } = await supabaseAdmin.storage.from(COACH_AVATAR_BUCKET).createSignedUrl(path, 60 * 60);
    return { ...company, avatar_url: error ? null : data?.signedUrl || null };
  } catch { return { ...company, avatar_url: null }; }
}
