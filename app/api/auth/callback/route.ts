import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("company_id") || searchParams.get("companyId");
    const experienceId = searchParams.get("experience_id") || searchParams.get("experienceId");

    if (companyId) {
      return NextResponse.redirect(new URL(`/dashboard/${companyId}`, req.url));
    }

    if (experienceId) {
      return NextResponse.redirect(new URL(`/experiences/${experienceId}`, req.url));
    }

    return NextResponse.redirect(new URL("/", req.url));
  } catch (error) {
    console.error("[Auth Callback] Error:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
