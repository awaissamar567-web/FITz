import { requireCoachAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { listClients, getClient } from "@/lib/services/clients";
import { listCheckins } from "@/lib/services/checkins";
import { getCurrentPlan } from "@/lib/services/plans";
import { seedDemoData } from "@/lib/services/seed";
import { AccessDenied } from "@/components/AccessDenied";
import { CoachDashboard } from "@/components/coach/CoachDashboard";
import { EnrichedClient } from "@/components/coach/ClientListTable";

interface DashboardPageProps {
  params: Promise<{
    companyId: string;
  }>;
  searchParams?: Promise<{
    demo?: string;
  }>;
}

export default async function CoachDashboardPage({ params, searchParams }: DashboardPageProps) {
  const { companyId } = await params;
  const sp = searchParams ? await searchParams : {};
  const isDemo = sp.demo === "true" || companyId.startsWith("biz_coach_alex");

  let authContext;
  try {
    if (isDemo) {
      authContext = { userId: `demo_coach_${companyId}`, companyId, accessLevel: "admin" as const, hasAccess: true };
    } else {
      authContext = await requireCoachAccess(companyId);
    }
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

  // Auto-seed canonical demo dataset if empty in demo mode
  let rawClients = await listClients(company.id);
  if (rawClients.length === 0 && (isDemo || companyId.startsWith("biz_coach_alex"))) {
    await seedDemoData(companyId);
    rawClients = await listClients(company.id);
  }

  // Load clients and enrich with last check-in and active plan status
  const enrichedClients: EnrichedClient[] = await Promise.all(
    rawClients.map(async (client) => {
      const checkins = await listCheckins(company.id, client.id, 1);
      const lastCheckin = checkins[0] || null;
      let daysSinceLastCheckin: number | null = null;

      if (lastCheckin) {
        const checkinDate = new Date(lastCheckin.date).getTime();
        const diffMs = Date.now() - checkinDate;
        daysSinceLastCheckin = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Check active assigned plan
      const plan = await getCurrentPlan(company.id, client.id);
      const hasActivePlan = Boolean(
        plan && (plan.exercises?.length > 0 || (plan as any).split || (plan as any).name)
      );

      return {
        ...client,
        lastCheckin,
        lastCheckinDate: lastCheckin?.date,
        daysSinceLastCheckin,
        hasActivePlan,
      };
    })
  );

  // Pre-fetch initial activity feed for instant zero-latency render
  const rawFeed = await listCheckins(company.id, undefined, 15);
  const initialFeed = await Promise.all(
    rawFeed.map(async (item: any) => {
      const client = await getClient(company.id, item.client_id);
      return {
        ...item,
        client_whop_user_id: client?.whop_user_id || "Unknown Client",
        client_display_name: (client as any)?.display_name || client?.whop_user_id || "Member",
        client_goal: client?.goal || null,
      };
    })
  );

  return (
    <CoachDashboard
      companyId={companyId}
      company={company}
      initialClients={enrichedClients}
      initialFeed={initialFeed}
    />
  );
}
