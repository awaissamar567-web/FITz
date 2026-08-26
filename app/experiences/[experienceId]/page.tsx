import React from "react";
import { requireClientAccess } from "@/lib/whop-auth";
import { getOrCreateCompany } from "@/lib/services/companies";
import { getClientByWhopUserId, createOrReactivateClient } from "@/lib/services/clients";
import { getCurrentPlan } from "@/lib/services/plans";
import { listCheckins } from "@/lib/services/checkins";
import { ClientPortal } from "@/components/client/ClientPortal";
import { AccessDenied } from "@/components/AccessDenied";

interface ClientExperiencePageProps {
  params: Promise<{
    experienceId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientExperiencePage({
  params,
  searchParams,
}: ClientExperiencePageProps) {
  const { experienceId } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isDemo = sParams?.demo === "true" || experienceId.startsWith("exp_");

  // Derive tenant company ID from experience or default sandbox coach
  const companyId =
    isDemo ||
    experienceId.includes("marcus") ||
    experienceId.includes("sarah") ||
    experienceId.includes("david") ||
    experienceId.includes("emma") ||
    experienceId.includes("liam")
      ? "biz_coach_alex"
      : "biz_default";

  let authContext;
  try {
    authContext = await requireClientAccess(experienceId, isDemo);
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

  // Ensure coach company exists
  const company = await getOrCreateCompany(companyId);
  if (!company) {
    return (
      <AccessDenied
        title="Coach Setup Pending"
        message="Your coach's workspace is currently being provisioned. Please check back shortly."
      />
    );
  }

  // Fetch or create initial client record for this member
  let client = await getClientByWhopUserId(company.id, authContext.userId);
  if (!client) {
    client = await getClientByWhopUserId(company.id, experienceId);
  }
  if (!client) {
    client = await createOrReactivateClient(company.id, authContext.userId, experienceId);
  }

  if (!client) {
    return (
      <AccessDenied
        title="Profile Initialization Failed"
        message="Unable to load or initialize your coaching profile. Please contact support."
      />
    );
  }

  // Fetch assigned plan & recent checkins
  const plan = await getCurrentPlan(company.id, client.id);
  const forceIntake =
    sParams?.intake === "true" ||
    sParams?.new === "true" ||
    experienceId.includes("fresh") ||
    experienceId.includes("intake") ||
    experienceId.includes("review");

  const effectiveClient = forceIntake ? { ...client, intake_completed: false } : client;

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 font-sans">
      <ClientPortal
        experienceId={experienceId}
        initialClient={effectiveClient}
        initialPlan={plan}
      />
    </div>
  );
}
