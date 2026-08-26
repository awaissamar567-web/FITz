import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, mockStore } from "@/lib/supabase/admin";
import { getOrCreateCompany } from "@/lib/services/companies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, count = 100 } = body;

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    }

    const company = await getOrCreateCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Set company plan to pro
    await supabaseAdmin
      .from("companies")
      .update({ plan: "pro" })
      .eq("id", company.id);

    const now = Date.now();
    const clientInserts = [];
    const checkinInserts = [];

    for (let i = 1; i <= count; i++) {
      const clientId = `mock_uuid_scale_client_${i}_${now}`;
      const joinedAt = new Date(now - (i % 20) * 86400000).toISOString();
      const status = i % 10 === 0 ? "at_risk" : "active";

      clientInserts.push({
        id: clientId,
        company_id: company.id,
        whop_user_id: `user_scale_${i}_${now}`,
        whop_experience_id: "exp_scale",
        status,
        goal: `Fitness Goal #${i}`,
        intake_completed: true,
        joined_at: joinedAt,
      });

      checkinInserts.push({
        id: `mock_uuid_scale_checkin_${i}_${now}`,
        company_id: company.id,
        client_id: clientId,
        date: "2026-08-20",
        weight: 70 + (i % 20),
        notes: `Weekly update for client ${i}`,
        created_at: new Date().toISOString(),
      });
    }

    // Batch insert
    await supabaseAdmin.from("clients").insert(clientInserts);
    await supabaseAdmin.from("checkins").insert(checkinInserts);

    return NextResponse.json({
      success: true,
      companyId,
      seededClients: count,
    });
  } catch (error) {
    console.error("[Seed Scale API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
