import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCompany } from "@/lib/services/companies";
import { createOrReactivateClient } from "@/lib/services/clients";
import { isMockEnv } from "@/lib/supabase/admin";

/** Development-only load-test fixture. It is unreachable in production. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || !isMockEnv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { companyId?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const companyId = body.companyId;
  const count = body.count;
  if (!companyId?.startsWith("biz_") || !Number.isInteger(count) || count! < 1 || count! > 250) {
    return NextResponse.json({ error: "Invalid companyId or count" }, { status: 400 });
  }

  const company = await getOrCreateCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company could not be created" }, { status: 500 });
  }

  await Promise.all(
    Array.from({ length: count! }, (_, index) =>
      createOrReactivateClient(
        company.id,
        `user_scale_${companyId}_${index + 1}`,
        `exp_scale_${companyId}_${index + 1}`
      )
    )
  );

  return NextResponse.json({ success: true, count }, { status: 201 });
}
