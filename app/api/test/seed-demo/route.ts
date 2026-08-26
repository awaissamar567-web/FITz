import { NextRequest, NextResponse } from "next/server";
import { seedDemoData } from "@/lib/services/seed";

export async function POST(req: NextRequest) {
  try {
    const companyWhopId = "biz_coach_alex";
    const res = await seedDemoData(companyWhopId);
    console.log("[Seed Debug] company.id:", res.company.id, "clients:", res.clients.length);

    return NextResponse.json({
      success: true,
      message: "Canonical demo dataset seeded successfully with Coach Alex Rivera and 5 synchronized client personas!",
      companyId: companyWhopId,
      clients: [
        { name: "Marcus Chen", id: "user_marcus", expId: "exp_marcus", status: "active", description: "Active member with assigned workout split, macros, and photo timeline" },
        { name: "Sarah Jenkins", id: "user_sarah", expId: "exp_sarah", status: "at_risk", description: "At-risk member (12 days since last check-in) in retention queue" },
        { name: "David Miller", id: "user_david", expId: "exp_david", status: "active", description: "Active member with recent check-in (2 days ago)" },
        { name: "Emma Watson", id: "user_emma", expId: "exp_emma", status: "intake_pending", description: "New member awaiting intake completion" },
        { name: "Liam O'Connor", id: "user_liam", expId: "exp_liam", status: "cancelled", description: "Deactivated member in cancelled filter" },
      ],
    });
  } catch (error) {
    console.error("[Seed Demo API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
