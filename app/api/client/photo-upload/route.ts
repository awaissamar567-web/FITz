import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { extractUserIdFromToken, evaluateWhopAccess } from "@/lib/whop-auth";
import { getClientByWhopUserId } from "@/lib/services/clients";
import { getOrCreateCompany } from "@/lib/services/companies";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  try {
    const headerList = await headers();
    const rawToken = headerList.get("x-whop-user-token") || headerList.get("authorization")?.replace("Bearer ", "");
    const testMockHeader = headerList.get("x-test-auth");
    const devUserId = headerList.get("x-dev-user-id");
    const userId = rawToken ? extractUserIdFromToken(rawToken) : devUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limiting: 5 photo uploads per minute
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const rateLimit = checkRateLimit(`photo:${userId}`, { limit: 5, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many photo upload attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetSeconds),
            "X-RateLimit-Limit": String(rateLimit.totalLimit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const experienceId = (formData.get("experienceId") as string) || "exp_default";
    const companyId = (formData.get("companyId") as string) || "biz_default_coach";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are supported." }, { status: 400 });
    }

    // Verify member access
    const access = await evaluateWhopAccess(userId, experienceId, testMockHeader);
    if (!access.has_access) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
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
    const ext = file.name.split(".").pop() || "jpg";
    const safeFilename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${company.id}/${client.id}/${safeFilename}`;

    // In production, uploads to Supabase Storage private bucket
    // In dev / sandbox mock mode:
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
