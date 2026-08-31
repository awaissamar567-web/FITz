import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { listClients } from "@/lib/services/clients";
import { listCheckins } from "@/lib/services/checkins";
import { listPlans } from "@/lib/services/plans";
import { AccessDenied } from "@/components/AccessDenied";
import { CoachDashboard } from "@/components/coach/CoachDashboard";
import { EnrichedClient } from "@/components/coach/ClientListTable";
import { withCoachAvatar } from "@/lib/services/coach-profile";

interface DashboardPageProps {
  params: Promise<{
    companyId: string;
  }>;
}

export default async function CoachDashboardPage({ params }: DashboardPageProps) {
  const { companyId } = await params;
  let authContext;
  try {
    authContext = await requireCoachAccess(companyId);
  } catch (error) {
    return (
      <AccessDenied
        title="Admin Access Required"
        message={`You do not have administrative access to manage company ${companyId}.`}
        reason="forbidden"
      />
    );
  }

  const company = await getOrCreateCompany(companyId);
  if (!company) {
    return (
      <AccessDenied
        title="Company Not Found"
        message="Unable to load or provision company records."
      />
    );
  }

  let rawClients = await listClients(company.id);

  const [tenantCheckins, tenantPlans] = await Promise.all([
    listCheckins(company.id, undefined, 1000),
    listPlans(company.id),
  ]);
  const clientById = new Map(rawClients.map((client) => [client.id, client]));
  const latestCheckinByClient = new Map<string, (typeof tenantCheckins)[number]>();
  for (const checkin of tenantCheckins) {
    if (!latestCheckinByClient.has(checkin.client_id)) latestCheckinByClient.set(checkin.client_id, checkin);
  }
  const plannedClientIds = new Set(tenantPlans.map((plan) => plan.client_id));

  const enrichedClients: EnrichedClient[] = rawClients.map((client) => {
      const lastCheckin = latestCheckinByClient.get(client.id) || null;
      let daysSinceLastCheckin: number | null = null;

      if (lastCheckin) {
        const checkinDate = new Date(lastCheckin.date).getTime();
        const diffMs = Date.now() - checkinDate;
        daysSinceLastCheckin = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        ...client,
        lastCheckin,
        lastCheckinDate: lastCheckin?.date,
        daysSinceLastCheckin,
        hasActivePlan: plannedClientIds.has(client.id),
      };
    });

  // Pre-fetch initial activity feed for instant zero-latency render
  const initialFeed = tenantCheckins.slice(0, 15).map((item: any) => {
      const client = clientById.get(item.client_id);
      return {
        ...item,
        client_whop_user_id: client?.whop_user_id || "Unknown Client",
        client_display_name: (client as any)?.display_name || client?.whop_user_id || "Member",
        client_goal: client?.goal || null,
      };
    });

  return (
    <CoachDashboard
      companyId={companyId}
      company={await withCoachAvatar(company)}
      initialClients={enrichedClients}
      initialFeed={initialFeed}
      initialCheckins={tenantCheckins}
      analyticsAsOf={new Date().toISOString()}
    />
  );
}
