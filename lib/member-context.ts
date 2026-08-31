import { isDemoRuntime, requireClientAccess, WhopAuthError } from "@/lib/whop-auth";
import { whopsdk } from "@/lib/whop-sdk";
import { isMockEnv } from "@/lib/supabase/admin";
import { getCompanyById, getOrCreateCompany } from "@/lib/services/companies";
import { createOrReactivateClient, getClientByWhopUserId } from "@/lib/services/clients";

/** Resolve the tenant from the verified experience, never from a request's companyId. */
export async function memberContext(experienceId: string, companyHint?: string, allowDemo = false) {
  if (typeof experienceId !== "string" || !experienceId.startsWith("exp_")) throw new WhopAuthError("Experience required", 403);
  const auth = await requireClientAccess(experienceId, allowDemo);
  let whopCompanyId: string;
  if (isMockEnv && isDemoRuntime()) {
    // Offline fixture only; still validates access to the supplied experience first.
    if (!companyHint) throw new WhopAuthError("Fixture company required", 403);
    const fixture = await getCompanyById(companyHint);
    whopCompanyId = fixture?.whop_company_id || companyHint;
  } else {
    const experience = await whopsdk.experiences.retrieve({ id: experienceId });
    whopCompanyId = experience.company.id;
  }
  const company = await getOrCreateCompany(whopCompanyId);
  if (!company) throw new Error("Workspace not found");
  if (companyHint && companyHint !== company.id && companyHint !== company.whop_company_id) {
    throw new WhopAuthError("Experience does not belong to this workspace", 403);
  }
  const client = await getClientByWhopUserId(company.id, auth.userId) ??
    await createOrReactivateClient(company.id, auth.userId, experienceId);
  if (!client) throw new Error("Client could not be provisioned");
  return { auth, company, client };
}
