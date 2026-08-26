import React from "react";
import { requireClientAccess } from "@/lib/whop-auth";
import { getCompanyById } from "@/lib/services/companies";
import { getClientByExperienceAndUser } from "@/lib/services/clients";
import { getCurrentPlan } from "@/lib/services/plans";
import { ClientPortal } from "@/components/client/ClientPortal";
import { AccessDenied } from "@/components/AccessDenied";

interface ClientExperiencePageProps {
  params: Promise<{
    experienceId: string;
  }>;
}

export default async function ClientExperiencePage({
  params,
}: ClientExperiencePageProps) {
  const { experienceId } = await params;
  let authContext;
  try {
    authContext = await requireClientAccess(experienceId);
  } catch (error: any) {
    return (
      <AccessDenied
        title="Membership Required"
        message={error.message || "Failed to verify Whop authentication."}
        reason="unauthorized"
      />
    );
  }

  if (!authContext.hasAccess) {
    return (
      <AccessDenied
        title="Membership Required"
        message={`You do not have an active membership for this coaching experience (${experienceId}).`}
        reason="forbidden"
      />
    );
  }

  const client = await getClientByExperienceAndUser(experienceId, authContext.userId);

  if (!client) {
    return (
      <AccessDenied
        title="Membership Setup Pending"
        message="Your membership is valid, but your coaching profile has not been provisioned yet. Please contact your coach."
      />
    );
  }

  const company = await getCompanyById(client.company_id);
  if (!company) {
    return <AccessDenied title="Coach Setup Pending" message="Your coach's workspace is not available yet." />;
  }

  // Fetch assigned plan & recent checkins
  const plan = await getCurrentPlan(company.id, client.id);
  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 font-sans">
      <ClientPortal
        experienceId={experienceId}
        initialClient={client}
        initialPlan={plan}
      />
    </div>
  );
}
