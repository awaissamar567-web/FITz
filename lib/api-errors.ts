import { NextResponse } from "next/server";
import { WhopAuthError } from "@/lib/whop-auth";

/**
 * Preserve the HTTP meaning of authentication failures without leaking
 * credential details. Unexpected exceptions remain generic 500 responses.
 */
export function apiErrorResponse(error: unknown, context: string) {
  if (error instanceof WhopAuthError) {
    console.warn(`${context} ${error.status}:`, error.message);
    return NextResponse.json(
      { error: error.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: error.status }
    );
  }

  console.error(`${context} Unexpected error:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
