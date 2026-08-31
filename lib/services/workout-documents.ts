import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import type { Plan } from "@/types/database";

export const WORKOUT_DOCUMENT_BUCKET = "workout-documents";
export const WORKOUT_DOCUMENT_MAX_BYTES = 3 * 1024 * 1024;

export function isWorkoutDocumentPath(path: unknown, companyId: string, clientId: string): boolean {
  return typeof path === "string" && path.startsWith(`${companyId}/${clientId}/`) &&
    /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-f0-9-]+\.pdf$/.test(path);
}

/** Only invoke after authorization for this plan's company and client. */
export async function withWorkoutDocument(plan: Plan): Promise<Plan> {
  const path = plan.pdf_url;
  if (!path) return plan;
  if (!isWorkoutDocumentPath(path, plan.company_id, plan.client_id)) {
    // Preserve historical HTTPS attachments, but never show browser-local blobs
    // or executable URL schemes as if another member could open them.
    return { ...plan, pdf_url: path.startsWith("https://") ? path : null };
  }
  if (isMockEnv) return { ...plan, pdf_url: `https://storage.fitz.local/workout-documents/${path}` };
  try {
    const { data, error } = await supabaseAdmin.storage.from(WORKOUT_DOCUMENT_BUCKET).createSignedUrl(path, 3600, { download: "workout-guide.pdf" });
    return { ...plan, pdf_url: error ? null : data?.signedUrl || null };
  } catch { return { ...plan, pdf_url: null }; }
}
