"use client";

import React, { useState } from "react";
import { EnrichedClient } from "@/components/coach/ClientListTable";
import { Checkin, Company } from "@/types/database";
import { RealtimeActivityFeed } from "@/components/coach/RealtimeActivityFeed";
import { LineTrendChart, LineTrendPoint } from "@/components/coach/LineTrendChart";
import { CheckCircle2, AlertCircle, Sparkles, ChevronRight, X, ArrowRight, ShieldCheck, Dumbbell, Users } from "lucide-react";
import { FREE_TIER_CLIENT_LIMIT } from "@/lib/constants/plans";

interface CoachAnalyticsDashboardProps {
  companyId: string;
  company: Company | null;
  clients: EnrichedClient[];
  checkins: Checkin[];
  analyticsAsOf: string;
  onNavigateToTab: (tab: "clients" | "programs" | "feed" | "retention" | "settings") => void;
  onSelectClient: (clientId: string) => void;
}

type TimeRangeFilter = "7d" | "14d" | "30d" | "all";

const DAY_MS = 24 * 60 * 60 * 1000;

interface AnalyticsBucket {
  start: number;
  end: number;
  label: string;
}

function startOfUtcDay(value: string | number): number {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatBucketLabel(timestamp: number, range: TimeRangeFilter): string {
  const date = new Date(timestamp);
  if (range === "7d") return new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(date);
  if (range === "all") return new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function buildAnalyticsBuckets(
  range: TimeRangeFilter,
  asOf: string,
  earliestTimestamp: number
): AnalyticsBucket[] {
  const endOfToday = startOfUtcDay(asOf) + DAY_MS;
  const fixedConfig = {
    "7d": { count: 7, daysPerBucket: 1 },
    "14d": { count: 7, daysPerBucket: 2 },
    "30d": { count: 6, daysPerBucket: 5 },
  } as const;

  let count = 6;
  let bucketMs: number;
  if (range === "all") {
    const observedSpan = Math.max(DAY_MS, endOfToday - earliestTimestamp);
    bucketMs = Math.max(DAY_MS, Math.ceil(observedSpan / count / DAY_MS) * DAY_MS);
  } else {
    count = fixedConfig[range].count;
    bucketMs = fixedConfig[range].daysPerBucket * DAY_MS;
  }

  const rangeStart = range === "all"
    ? Math.min(earliestTimestamp, endOfToday - bucketMs * count)
    : endOfToday - bucketMs * count;

  return Array.from({ length: count }, (_, index) => {
    const start = rangeStart + index * bucketMs;
    const end = index === count - 1 ? endOfToday : start + bucketMs;
    return { start, end, label: formatBucketLabel(start, range) };
  });
}

export function CoachAnalyticsDashboard({
  companyId,
  company,
  clients,
  checkins,
  analyticsAsOf,
  onNavigateToTab,
  onSelectClient,
}: CoachAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("30d");
  const [showChecklist, setShowChecklist] = useState(true);

  const activeClients = clients.filter((c) => c.status === "active");
  const atRiskClients = clients.filter((c) => c.status === "at_risk");
  const intakeDoneClients = clients.filter((c) => c.intake_completed);
  const planAssignedClients = clients.filter((c) => c.hasActivePlan);

  const activeCount = clients.filter((c) => c.status === "active" || c.status === "at_risk").length;
  const intakeCount = intakeDoneClients.length;
  const planCount = planAssignedClients.length;
  const atRiskCount = atRiskClients.length;
  const pendingIntakeClients = clients.filter((client) => !client.intake_completed && client.status !== "cancelled");
  const firstPendingIntake = pendingIntakeClients[0];
  const firstAtRisk = atRiskClients[0];

  const intakePercentage = clients.length > 0 ? Math.round((intakeCount / clients.length) * 100) : 0;
  const planPercentage = clients.length > 0 ? Math.round((planCount / clients.length) * 100) : 0;

  const eligibleClients = clients.filter((c) => c.status === "active" || c.status === "at_risk");
  const earliestTimestamp = Math.min(
    startOfUtcDay(analyticsAsOf),
    ...eligibleClients.map((client) => startOfUtcDay(client.joined_at)),
    ...checkins.map((checkin) => startOfUtcDay(checkin.date))
  );
  const analyticsBuckets = buildAnalyticsBuckets(timeRange, analyticsAsOf, earliestTimestamp);
  const eligibleIds = new Set(eligibleClients.map((client) => client.id));

  const adherenceTrend: LineTrendPoint[] = analyticsBuckets.map((bucket) => {
    const rosterAtBucketEnd = eligibleClients.filter((client) => startOfUtcDay(client.joined_at) < bucket.end);
    const rosterIds = new Set(rosterAtBucketEnd.map((client) => client.id));
    const checkedInIds = new Set(
      checkins
        .filter((checkin) => {
          const timestamp = startOfUtcDay(checkin.date);
          return timestamp >= bucket.start && timestamp < bucket.end && rosterIds.has(checkin.client_id);
        })
        .map((checkin) => checkin.client_id)
    );
    const value = rosterAtBucketEnd.length > 0
      ? Math.round((checkedInIds.size / rosterAtBucketEnd.length) * 100)
      : 0;
    return {
      label: bucket.label,
      value,
      detail: `${bucket.label}: ${checkedInIds.size} of ${rosterAtBucketEnd.length} active clients checked in (${value}%).`,
    };
  });

  const rosterTrend: LineTrendPoint[] = analyticsBuckets.map((bucket) => {
    const value = eligibleClients.filter((client) => startOfUtcDay(client.joined_at) < bucket.end).length;
    return {
      label: bucket.label,
      value,
      detail: `${bucket.label}: ${value} active ${value === 1 ? "client" : "clients"} in the roster.`,
    };
  });
  const rosterGrowth = (rosterTrend.at(-1)?.value || 0) - (rosterTrend[0]?.value || 0);

  const checkinsInRange = checkins.filter((checkin) => {
    const timestamp = startOfUtcDay(checkin.date);
    return timestamp >= analyticsBuckets[0].start && timestamp < analyticsBuckets.at(-1)!.end && eligibleIds.has(checkin.client_id);
  }).length;

  const timeRangeLabels: Record<TimeRangeFilter, string> = {
    "7d": "Last 7 Days",
    "14d": "Last 14 Days",
    "30d": "Last 30 Days",
    "all": "All Time",
  };

  return (
    <div className="space-y-6 font-sans">
      {/* -----------------------------------------------------------------------
          1. HEADER SUMMARY BANNER + DAYS FILTER
          ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Dashboard Overview
          </h1>
        </div>

        {/* Days Filter Segmented Control: 7 Days | 14 Days | 30 Days | All Time */}
        <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md self-start sm:self-auto">
          {(
            [
              { id: "7d", label: "7 Days" },
              { id: "14d", label: "14 Days" },
              { id: "30d", label: "30 Days" },
              { id: "all", label: "All Time" },
            ] as const
          ).map((item) => {
            const isSelected = timeRange === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeRange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-3xs font-medium transition-all active:scale-[0.98] ${
                  isSelected
                    ? "bg-[#1754d8] text-white shadow-sm shadow-[#1754d8]/30 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          COACH WEEKLY OPERATING CHECKLIST (Manus Audit Recommendation)
          ----------------------------------------------------------------------- */}
      {showChecklist && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1754d8]/10 via-[#0c0c0e]/90 to-[#0c0c0e]/90 border border-[#1754d8]/30 shadow-xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#1754d8]/20 text-[#3b82f6] border border-[#1754d8]/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  Weekly Operating Checklist
                  <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-[#1754d8]/25 text-[#3b82f6] border border-[#1754d8]/40">
                    3 of 5 completed
                  </span>
                </h3>
                <p className="text-3xs text-zinc-400 mt-0.5">
                  Keep your Whop coaching business on track with zero manual guesswork.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowChecklist(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
              title="Minimize checklist"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Checklist Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Step 1: Cadence Config */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <span className="text-3xs font-medium text-white block truncate">Coaching Cadence</span>
                <span className="text-3xs text-emerald-400 font-mono block">Weekly ({company?.units || "kg"}) • Ready</span>
              </div>
            </div>

            {/* Step 2: Templates Ready */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <span className="text-3xs font-medium text-white block truncate">Workout Split Templates</span>
                <span className="text-3xs text-emerald-400 font-mono block">4 Pre-built Splits Ready</span>
              </div>
            </div>

            {/* Step 3: Pending Intake */}
            <div
              onClick={() => onNavigateToTab("clients")}
              className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start justify-between gap-2 cursor-pointer hover:bg-amber-950/30 transition-all group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-3xs font-medium text-amber-200 block truncate">{pendingIntakeClients.length} Member{pendingIntakeClients.length === 1 ? "" : "s"} Awaiting Intake</span>
                  <span className="text-3xs text-amber-400/90 font-mono block">{firstPendingIntake?.display_name || firstPendingIntake?.whop_user_id || "No pending intakes"}</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
            </div>

            {/* Step 4: Churn Intervention */}
            <div
              onClick={() => onNavigateToTab("retention")}
              className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start justify-between gap-2 cursor-pointer hover:bg-red-950/30 transition-all group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-3xs font-medium text-red-200 block truncate">{atRiskCount} At-Risk Churn Alert{atRiskCount === 1 ? "" : "s"}</span>
                  <span className="text-3xs text-red-400/90 font-mono block">{firstAtRisk ? `${firstAtRisk.display_name || firstAtRisk.whop_user_id} (${firstAtRisk.daysSinceLastCheckin ?? "—"}d overdue)` : "No at-risk members"}</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          2. KEY PERFORMANCE INDICATOR (KPI) METRIC CARDS (Minimalist, Vector-Clean)
          ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Active Roster */}
        <div
          onClick={() => onNavigateToTab("clients")}
          className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-3 cursor-pointer hover:border-[#1754d8]/50 hover:bg-[#1754d8]/5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs uppercase tracking-wider font-medium text-zinc-400">
              Total Roster
            </span>
            <span className="text-3xs font-mono text-emerald-400 font-medium">
              {rosterGrowth > 0 ? "+" : ""}{rosterGrowth} {timeRange === "all" ? "total" : timeRange}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight font-mono">
              {activeCount}
            </div>
            <span className="text-3xs font-mono text-zinc-500">
              {company?.plan === "pro" ? "Unlimited" : `Max ${FREE_TIER_CLIENT_LIMIT}`}
            </span>
          </div>
          <p className="text-3xs font-normal text-zinc-400">
            {activeClients.length} members actively logging
          </p>
        </div>

        {/* Card 2: Intake Onboarding Completed */}
        <div
          onClick={() => onNavigateToTab("clients")}
          className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-3 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-950/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs uppercase tracking-wider font-medium text-zinc-400">
              Intake Completed
            </span>
            <span className="text-3xs font-mono text-emerald-400 font-medium">
              {intakePercentage}% Done
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight font-mono">
              {intakeCount}
              <span className="text-xs text-zinc-500 font-normal"> / {clients.length}</span>
            </div>
          </div>
          <p className="text-3xs font-normal text-zinc-400">
            {clients.length - intakeCount} pending questionnaire
          </p>
        </div>

        {/* Card 3: Active Plan Assigned */}
        <div
          onClick={() => onNavigateToTab("programs")}
          className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-3 cursor-pointer hover:border-[#1754d8]/50 hover:bg-[#1754d8]/5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs uppercase tracking-wider font-medium text-zinc-400">
              Plans Assigned
            </span>
            <span className="text-3xs font-mono text-[#1754d8] font-medium">
              {planPercentage}% Active
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight font-mono">
              {planCount}
              <span className="text-xs text-zinc-500 font-normal"> / {clients.length}</span>
            </div>
          </div>
          <p className="text-3xs font-normal text-zinc-400">
            {clients.length - planCount} awaiting workout split
          </p>
        </div>

        {/* Card 4: At-Risk Churn Alert */}
        <div
          onClick={() => onNavigateToTab("retention")}
          className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-3 cursor-pointer hover:border-amber-500/50 hover:bg-amber-950/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs uppercase tracking-wider font-medium text-amber-400">
              At-Risk Inactive
            </span>
            <span className="text-3xs font-mono text-amber-400 font-medium">
              &gt;{company?.at_risk_threshold_days || 7}d
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-display font-semibold text-amber-300 tracking-tight font-mono">
              {atRiskCount}
            </div>
            <span className="text-3xs font-mono text-amber-400/90 font-medium">
              Review Roster
            </span>
          </div>
          <p className="text-3xs font-normal text-zinc-400">
            {atRiskCount > 0 ? "Requires retention outreach" : "All clients on schedule"}
          </p>
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          3. VISUAL ANALYTICS & CHARTS GRID
          ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineTrendChart
          title={`Check-In Adherence · ${timeRangeLabels[timeRange]}`}
          description={`${checkinsInRange} check-ins recorded. Unique active clients per period, measured against the roster available then.`}
          points={adherenceTrend}
          color="emerald"
          valueSuffix="%"
          target={85}
          targetLabel="85% coaching target"
          maxValue={100}
          emptyLabel="No client check-ins in this range yet."
        />
        <LineTrendChart
          title={`Active Roster Growth · ${timeRangeLabels[timeRange]}`}
          description="Cumulative active and at-risk clients, based on their real join dates. Cancelled members are excluded."
          points={rosterTrend}
          color="blue"
          emptyLabel="No active clients joined in this range yet."
        />
      </div>

      {/* -----------------------------------------------------------------------
          4. RECENT ROSTER SNAPSHOT + LIVE ACTIVITY FEED
          ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Client Roster Snapshot (7 cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">
                Client Roster Quickview
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab("clients")}
              className="py-1 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-3xs font-medium border border-white/[0.06] transition-colors"
            >
              <span>View All ({clients.length})</span>
            </button>
          </div>

          <div className="space-y-2">
            {clients.slice(0, 5).map((client) => {
              const displayName = (client as any).display_name || client.whop_user_id;
              const isAtRisk = client.status === "at_risk";

              return (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.1] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#1754d8]/15 border border-[#1754d8]/30 flex items-center justify-center text-[#1754d8] font-display font-semibold text-xs shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white group-hover:text-[#1754d8] transition-colors">
                        {displayName}
                      </p>
                      <p className="text-3xs text-zinc-500 font-mono">@{client.whop_user_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-3xs font-medium px-2 py-0.5 rounded-md capitalize ${
                        isAtRisk
                          ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                          : client.status === "active"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {isAtRisk ? "⚠️ At Risk" : client.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Live Activity Stream (5 cols) */}
        <div className="lg:col-span-5">
          <RealtimeActivityFeed
            companyId={companyId}
            onSelectClient={onSelectClient}
          />
        </div>
      </div>
    </div>
  );
}
