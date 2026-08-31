import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCoachAccess } from "@/lib/whop-auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getOrCreateCompany } from "@/lib/services/companies";
import { getClient } from "@/lib/services/clients";
import { requireCoachingSlot } from "@/lib/services/entitlements";
import { checkRateLimit } from "@/lib/rate-limiter";
import { isMockEnv, supabaseAdmin } from "@/lib/supabase/admin";
import { WORKOUT_DOCUMENT_BUCKET, WORKOUT_DOCUMENT_MAX_BYTES } from "@/lib/services/workout-documents";

export async function POST(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    const clientId = req.nextUrl.searchParams.get("clientId");
    if (!companyId || !clientId) return NextResponse.json({ error: "Company and client are required" }, { status: 400 });
    const auth = await requireCoachAccess(companyId);
    const company = await getOrCreateCompany(companyId);
    const client = company && await getClient(company.id, clientId);
    if (!company || !client) return NextResponse.json({ error: "Client not found in this workspace" }, { status: 404 });
    await requireCoachingSlot(company, client.id);
    const rate = checkRateLimit(`workout-document:${auth.userId}`, { limit: 6, windowSeconds: 60 });
    if (!rate.allowed) return NextResponse.json({ error: "Please wait before uploading another document" }, { status: 429 });
    if (Number(req.headers.get("content-length")) > WORKOUT_DOCUMENT_MAX_BYTES + 32768) return NextResponse.json({ error: "PDF must be 3 MB or smaller" }, { status: 413 });
    let form: FormData;
    try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid upload" }, { status: 400 }); }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.type !== "application/pdf") return NextResponse.json({ error: "Choose a PDF document" }, { status: 400 });
    if (file.size > WORKOUT_DOCUMENT_MAX_BYTES) return NextResponse.json({ error: "PDF must be 3 MB or smaller" }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return NextResponse.json({ error: "File is not a valid PDF" }, { status: 400 });
    const path = `${company.id}/${client.id}/${randomUUID()}.pdf`;
    if (!isMockEnv) {
      const { error } = await supabaseAdmin.storage.from(WORKOUT_DOCUMENT_BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (error) throw error;
    }
    return NextResponse.json({ storagePath: path }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error, "[Workout Document]"); }
}
