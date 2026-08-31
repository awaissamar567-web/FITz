import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { whopAppSdk } from "@/lib/whop-app-sdk";

export interface AuthContext {
  userId: string;
  companyId?: string;
  experienceId?: string;
  accessLevel: "admin" | "customer" | "no_access";
  hasAccess: boolean;
}

export class WhopAuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403
  ) {
    super(message);
    this.name = "WhopAuthError";
  }
}

type AccessResult = {
  has_access: boolean;
  access_level: "admin" | "customer" | "no_access";
};

const isProduction = process.env.NODE_ENV === "production";

/** Demo and test identities are deliberately unavailable in production. */
export function isDemoRuntime(): boolean {
  return !isProduction && process.env.FITZ_DEMO_MODE !== "false";
}

function bearerToken(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/^Bearer\s+/i, "").trim() || null;
}

function decodeTestUserId(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Validate the signed iframe JWT and return its Whop user ID. */
async function verifyWhopUserToken(token: string): Promise<string> {
  const { userId } = await whopAppSdk.verifyUserToken(token);
  if (!userId) throw new Error("Whop token did not resolve a user");
  return userId;
}

async function requestIdentity(resourceId: string, role: "coach" | "client", allowDemo = false) {
  const requestHeaders = await headers();
  const token = bearerToken(
    requestHeaders.get("x-whop-user-token") || requestHeaders.get("authorization")
  );

  if (isDemoRuntime()) {
    const testUser = requestHeaders.get("x-dev-user-id");
    const testAccess = requestHeaders.get("x-test-auth");
    if (testUser) return { userId: testUser, testAccess };
    if (testAccess && token) {
      const tokenUser = decodeTestUserId(token);
      if (tokenUser) return { userId: tokenUser, testAccess };
    }
  }

  if (token) {
    try {
      return { userId: await verifyWhopUserToken(token), testAccess: null as string | null };
    } catch {
      throw new WhopAuthError("Unauthorized: Invalid or expired Whop user token", 401);
    }
  }

  if (isDemoRuntime()) {
    let refererDemo = false;
    try {
      const referer = requestHeaders.get("referer");
      refererDemo = Boolean(referer && new URL(referer).searchParams.get("demo") === "true");
    } catch {}

    if (allowDemo || refererDemo || requestHeaders.get("x-demo-user") === "true") {
      return { userId: `demo_${role}_${resourceId}`, testAccess: null as string | null };
    }
  }

  throw new WhopAuthError("Unauthorized: Missing Whop user token", 401);
}

export async function evaluateWhopAccess(
  userId: string,
  resourceId: string,
  testMockHeader?: string | null
): Promise<AccessResult> {
  if (isDemoRuntime() && testMockHeader) {
    try {
      const permissions = JSON.parse(testMockHeader) as Record<string, AccessResult>;
      return permissions[resourceId] || { has_access: false, access_level: "no_access" };
    } catch {
      return { has_access: false, access_level: "no_access" };
    }
  }

  if (isDemoRuntime() && (userId.startsWith("demo_") || userId.startsWith("user_"))) {
    const coach = userId.includes("coach");
    return { has_access: true, access_level: coach ? "admin" : "customer" };
  }

  try {
    const response = await whopsdk.users.checkAccess({ id: userId, resource_id: resourceId });
    const accessLevel = (response.access_level || (response.has_access ? "customer" : "no_access")) as AccessResult["access_level"];
    return { has_access: Boolean(response.has_access), access_level: accessLevel };
  } catch {
    return { has_access: false, access_level: "no_access" };
  }
}

export async function requireCoachAccess(companyId: string, allowDemo = false): Promise<AuthContext> {
  const identity = await requestIdentity(companyId, "coach", allowDemo);
  const access = await evaluateWhopAccess(identity.userId, companyId, identity.testAccess);
  if (!access.has_access || access.access_level !== "admin") throw new WhopAuthError("Forbidden: Admin access required", 403);
  return { userId: identity.userId, companyId, accessLevel: "admin", hasAccess: true };
}

export async function requireClientAccess(experienceId: string, allowDemo = false): Promise<AuthContext> {
  const identity = await requestIdentity(experienceId, "client", allowDemo);
  const access = await evaluateWhopAccess(identity.userId, experienceId, identity.testAccess);
  if (!access.has_access) throw new WhopAuthError("Forbidden: Active membership required", 403);
  return { userId: identity.userId, experienceId, accessLevel: access.access_level, hasAccess: true };
}
