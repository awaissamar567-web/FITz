import React from "react";
import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/whop-auth";
import { getCompanyById, getOrCreateCompany } from "@/lib/services/companies";
import { createOrReactivateClient, getClientByExperienceAndUser } from "@/lib/services/clients";
import { getCurrentPlan } from "@/lib/services/plans";
import { whopsdk } from "@/lib/whop-sdk";
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

  // Whop can open an Experience entry while a company team member is
  // previewing as Admin. Send that admin to the coach surface automatically;
  // customers remain on the member Experience below.
  if (authContext.accessLevel === "admin") {
    try {
      const experience = await whopsdk.experiences.retrieve({ id: experienceId });
      redirect(`/dashboard/${experience.company.id}`);
    } catch (error: any) {
      // Next.js implements redirect() by throwing a framework-owned error.
      if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
      console.error(`[Experience] Failed to resolve admin dashboard for ${experienceId}:`, error);
    }
  }

  let client = await getClientByExperienceAndUser(experienceId, authContext.userId);

  // Membership webhooks identify the product and company, but do not include
  // the concrete experience ID. Resolve the verified experience on first load
  // so new members and authorized previews are provisioned into the right tenant.
  if (!client) {
    try {
      const experience = await whopsdk.experiences.retrieve({ id: experienceId });
      const tenant = await getOrCreateCompany(experience.company.id);
      if (tenant) {
        client = await createOrReactivateClient(
          tenant.id,
          authContext.userId,
          experienceId
        );
      }
    } catch (error) {
      console.error(`[Experience] Failed to provision ${experienceId}:`, error);
    }
  }

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
