import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getOrCreateCompany, updateCompanySettings } from "@/lib/services/companies";
import { COACH_AVATAR_BUCKET, withCoachAvatar } from "@/lib/services/coach-profile";
import { COACH_PHOTO_MAX_BYTES, COACH_PHOTO_TYPES, coachPhotoMatchesType, validateCoachProfile } from "@/lib/coach-profile";
import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId || !/^biz_[a-zA-Z0-9_]+$/.test(companyId)) return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
    await requireCoachAccess(companyId);
    const company = await getOrCreateCompany(companyId);
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json({ company: await withCoachAvatar(company) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error, "[Coach Profile GET]"); }
}

export async function POST(req: NextRequest) {
  let uploadedPath: string | null = null;
  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId || !/^biz_[a-zA-Z0-9_]+$/.test(companyId)) return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
    // Authenticate before parsing an upload or touching storage.
    const auth = await requireCoachAccess(companyId);
    const rate = checkRateLimit(`coach-profile:${companyId}:${auth.userId}`, { limit: 15, windowSeconds: 60 });
    if (!rate.allowed) return NextResponse.json({ error: "Too many updates. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.resetSeconds) } });
    if (Number(req.headers.get("content-length")) > COACH_PHOTO_MAX_BYTES + 32 * 1024) return NextResponse.json({ error: "Profile photo must be 2 MB or smaller." }, { status: 413 });
    let form: FormData;
    try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid profile form." }, { status: 400 }); }
    const name = form.get("coach_name");
    const expertise = form.get("coach_expertise");
    const rawYears = form.get("coach_years_experience");
    const years = typeof rawYears === "string" && /^\d{1,2}$/.test(rawYears) ? Number(rawYears) : NaN;
    const validation = validateCoachProfile(name, years, expertise);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
    const photo = form.get("photo");
    if (photo !== null && (!(photo instanceof File) || photo.size === 0)) return NextResponse.json({ error: "Choose a valid profile photo." }, { status: 400 });
    if (photo instanceof File && photo.size > COACH_PHOTO_MAX_BYTES) return NextResponse.json({ error: "Profile photo must be 2 MB or smaller." }, { status: 413 });
    if (photo instanceof File && !COACH_PHOTO_TYPES.includes(photo.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP photo." }, { status: 400 });
    const bytes = photo instanceof File ? Buffer.from(await photo.arrayBuffer()) : null;
    if (bytes && photo instanceof File && !coachPhotoMatchesType(bytes, photo.type)) return NextResponse.json({ error: "The photo contents do not match its image type." }, { status: 400 });
    const company = await getOrCreateCompany(companyId);
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    let avatarPath = form.get("remove_photo") === "true" ? null : company.coach_avatar_path || null;
    if (photo instanceof File && bytes) {
      const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[photo.type]!;
      avatarPath = `${company.id}/${randomUUID()}.${ext}`;
      if (!isMockEnv) {
        const { error } = await supabaseAdmin.storage.from(COACH_AVATAR_BUCKET).upload(avatarPath, bytes, { contentType: photo.type, upsert: false });
        if (error) throw error;
        uploadedPath = avatarPath;
      }
    }
    const updated = await updateCompanySettings(companyId, {
      coach_name: (name as string).trim(), coach_years_experience: years,
      coach_expertise: (expertise as string).trim(), coach_avatar_path: avatarPath,
      coach_onboarded_at: company.coach_onboarded_at || new Date().toISOString(),
    });
    if (!updated) throw new Error("Coach profile was not saved");
    uploadedPath = null; // The database now owns this upload; do not delete it.
    return NextResponse.json({ success: true, company: await withCoachAvatar(updated) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (uploadedPath && !isMockEnv) {
      // Only remove this request's uncommitted upload; never another coach's file.
      try { await supabaseAdmin.storage.from(COACH_AVATAR_BUCKET).remove([uploadedPath]); } catch {}
    }
    return apiErrorResponse(error, "[Coach Profile POST]");
  }
}
