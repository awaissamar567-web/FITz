import { supabaseAdmin } from "@/lib/supabase/admin";
import { Company, Client, ClientStatus } from "@/types/database";
import { listCheckins } from "@/lib/services/checkins";
import { requirePro, coachingSlots } from "@/lib/entitlements";

export interface RiskEvaluationResult {
  isAtRisk: boolean;
  reason?: string;
  daysLapsed?: number;
}

/**
 * Evaluates whether a client is at risk of churning based on PRD Section 4.3 rules:
 * - Daily check-in frequency: 3+ days missed
 * - Weekly check-in frequency: 10+ days missed
 * - No check-in logged: 5+ days after join date
 */
export function evaluateClientRisk(
  frequency: "daily" | "weekly",
  joinedAt: string,
  lastCheckinDate: string | null,
  currentDate = new Date()
): RiskEvaluationResult {
  const nowMs = currentDate.getTime();

  if (!lastCheckinDate) {
    const joinedMs = new Date(joinedAt).getTime();
    const daysSinceJoin = Math.floor((nowMs - joinedMs) / (1000 * 60 * 60 * 24));
    if (daysSinceJoin >= 5) {
      return {
        isAtRisk: true,
        reason: `No initial check-in logged (${daysSinceJoin} days since joining)`,
        daysLapsed: daysSinceJoin,
      };
    }
    return { isAtRisk: false, daysLapsed: daysSinceJoin };
  }

  const lastCheckinMs = new Date(lastCheckinDate).getTime();
  const daysSinceCheckin = Math.floor((nowMs - lastCheckinMs) / (1000 * 60 * 60 * 24));

  const thresholdDays = frequency === "daily" ? 3 : 10;

  if (daysSinceCheckin >= thresholdDays) {
    return {
      isAtRisk: true,
      reason: `Missed check-in: ${daysSinceCheckin} days since last check-in (threshold: ${thresholdDays}d)`,
      daysLapsed: daysSinceCheckin,
    };
  }

  return { isAtRisk: false, daysLapsed: daysSinceCheckin };
}

/**
 * Runs retention analysis across all non-cancelled clients for a company.
 * Updates clients.status to 'at_risk' or 'active'.
 * Supports asOfDate simulation for automated testing and historical analysis.
 */
export async function syncCompanyAtRiskClients(
  company: Company,
  asOfDate?: Date
): Promise<{
  totalEvaluated: number;
  atRiskCount: number;
  recoveredCount: number;
}> {
  const { listClients } = await import("@/lib/services/clients");
  requirePro(company, "Automated churn queue");
  const allClients = await listClients(company.id);
  const selected = new Set(coachingSlots(company, allClients).selectedIds);
  const clients = allClients.filter(c => selected.has(c.id));

  let atRiskCount = 0;
  let recoveredCount = 0;

  for (const client of clients) {
    // Preserve cancelled status
    if (client.status === "cancelled") {
      continue;
    }

    const checkins = await listCheckins(company.id, client.id, 1);
    const lastCheckinDate = checkins[0]?.date || null;

    const risk = evaluateClientRisk(
      company.default_checkin_frequency || "weekly",
      client.joined_at,
      lastCheckinDate,
      asOfDate
    );

    if (risk.isAtRisk && client.status !== "at_risk") {
      client.status = "at_risk";
      try {
        await supabaseAdmin
          .from("clients")
          .update({ status: "at_risk" })
          .eq("id", client.id)
          .eq("company_id", company.id);
      } catch {}
      atRiskCount++;
    } else if (!risk.isAtRisk && client.status === "at_risk") {
      client.status = "active";
      try {
        await supabaseAdmin
          .from("clients")
          .update({ status: "active" })
          .eq("id", client.id)
          .eq("company_id", company.id);
      } catch {}
      recoveredCount++;
    }
  }

  return {
    totalEvaluated: clients.length,
    atRiskCount,
    recoveredCount,
  };
}
