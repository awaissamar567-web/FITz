import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/whop-auth";
import { getClientByWhopUserId } from "@/lib/services/clients";
import { getOrCreateCompany } from "@/lib/services/companies";
import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const experienceId = (formData.get("experienceId") as string) || "exp_default";
    const companyId = (formData.get("companyId") as string) || "biz_default_coach";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds the 8 MB limit" }, { status: 413 });
    }

    // MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are supported." }, { status: 400 });
    }

    const isDemo = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("demo") === "true";
    const auth = await requireClientAccess(experienceId, isDemo);
    const userId = auth.userId;

    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const rateLimit = checkRateLimit(`photo:${userId}`, { limit: 5, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many photo upload attempts. Please try again shortly." }, {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetSeconds) },
      });
    }

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const client = await getClientByWhopUserId(company.id, userId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Generate secure storage path: company_id/client_id/timestamp_random.ext
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
    };
    const ext = extensionByType[file.type];
    const safeFilename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${company.id}/${client.id}/${safeFilename}`;

    if (!isMockEnv) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabaseAdmin.storage
        .from("checkin-photos")
        .upload(storagePath, bytes, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      return NextResponse.json({ success: true, storagePath, photoUrl: storagePath });
    }

    const mockStorageUrl = `https://storage.fitz.local/checkin-photos/${storagePath}`;

    return NextResponse.json({
      success: true,
      storagePath,
      photoUrl: mockStorageUrl,
    }, { status: 200 });
  } catch (error) {
    console.error("[Photo Upload API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
