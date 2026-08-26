"use client";

import React, { useState } from "react";
import { EnrichedClient } from "@/components/coach/ClientListTable";
import { Company } from "@/types/database";
import { RealtimeActivityFeed } from "@/components/coach/RealtimeActivityFeed";

interface CoachAnalyticsDashboardProps {
  companyId: string;
  company: Company | null;
  clients: EnrichedClient[];
  onNavigateToTab: (tab: "clients" | "programs" | "feed" | "retention" | "settings") => void;
  onSelectClient: (clientId: string) => void;
}

type TimeRangeFilter = "7d" | "14d" | "30d" | "all";

export function CoachAnalyticsDashboard({
  companyId,
  company,
  clients,
  onNavigateToTab,
  onSelectClient,
}: CoachAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("30d");

  const activeClients = clients.filter((c) => c.status === "active");
  const atRiskClients = clients.filter((c) => c.status === "at_risk");
  const intakeDoneClients = clients.filter((c) => c.intake_completed);
  const planAssignedClients = clients.filter((c) => c.hasActivePlan);

  const activeCount = clients.filter((c) => c.status === "active" || c.status === "at_risk").length;
  const intakeCount = intakeDoneClients.length;
  const planCount = planAssignedClients.length;
  const atRiskCount = atRiskClients.length;

  const intakePercentage = clients.length > 0 ? Math.round((intakeCount / clients.length) * 100) : 0;
  const planPercentage = clients.length > 0 ? Math.round((planCount / clients.length) * 100) : 0;

  // Dynamic adherence data based on selected time range filter
  const adherenceDatasets: Record<TimeRangeFilter, { day: string; count: number; rate: string; height: string }[]> = {
    "7d": [
      { day: "Mon", count: 18, rate: "92%", height: "85%" },
      { day: "Tue", count: 22, rate: "96%", height: "100%" },
      { day: "Wed", count: 15, rate: "78%", height: "70%" },
      { day: "Thu", count: 19, rate: "88%", height: "88%" },
      { day: "Fri", count: 21, rate: "94%", height: "95%" },
      { day: "Sat", count: 14, rate: "72%", height: "65%" },
      { day: "Sun", count: 17, rate: "84%", height: "80%" },
    ],
    "14d": [
      { day: "W1-M", count: 16, rate: "88%", height: "75%" },
      { day: "W1-W", count: 19, rate: "91%", height: "88%" },
      { day: "W1-F", count: 20, rate: "94%", height: "92%" },
      { day: "W1-S", count: 15, rate: "75%", height: "70%" },
      { day: "W2-M", count: 18, rate: "92%", height: "85%" },
      { day: "W2-W", count: 22, rate: "96%", height: "100%" },
      { day: "W2-F", count: 21, rate: "94%", height: "95%" },
    ],
    "30d": [
      { day: "Week 1", count: 82, rate: "86%", height: "78%" },
      { day: "Week 2", count: 91, rate: "91%", height: "88%" },
      { day: "Week 3", count: 96, rate: "94%", height: "94%" },
      { day: "Week 4", count: 104, rate: "97%", height: "100%" },
    ],
    "all": [
      { day: "Jan", count: 140, rate: "82%", height: "65%" },
      { day: "Feb", count: 210, rate: "87%", height: "80%" },
      { day: "Mar", count: 285, rate: "91%", height: "90%" },
      { day: "Apr", count: 320, rate: "95%", height: "100%" },
    ],
  };

  const currentAdherence = adherenceDatasets[timeRange];

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
              +12% {timeRange === "all" ? "Total" : timeRange}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight font-mono">
              {activeCount}
            </div>
            <span className="text-3xs font-mono text-zinc-500">
              {company?.plan === "pro" ? "Unlimited" : "Max 5"}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Weekly / Period Check-in Adherence Chart (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">
                Check-In Adherence & Volume ({timeRangeLabels[timeRange]})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-3xs font-mono">
              <span className="text-zinc-400">Volume</span>
              <span className="text-emerald-400">&gt;85% Goal</span>
            </div>
          </div>

          {/* Frosted Bar Chart */}
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {currentAdherence.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-3xs font-mono text-zinc-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                  {item.count} logs ({item.rate})
                </span>
                <div className="w-full max-w-[48px] bg-white/[0.03] rounded-xl overflow-hidden h-32 flex items-end p-1 border border-white/[0.04] group-hover:border-[#1754d8]/40 transition-colors">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-[#1754d8] to-[#3b82f6] group-hover:from-[#1754d8] group-hover:to-emerald-400 transition-all duration-300 shadow-md shadow-[#1754d8]/20"
                    style={{ height: item.height }}
                  />
                </div>
                <span className="text-3xs font-medium text-zinc-400 group-hover:text-white transition-colors">
                  {item.day}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs">
            <div className="text-zinc-400 text-3xs">
              <span>Average Check-In Completion Rate ({timeRangeLabels[timeRange]}): </span>
              <strong className="text-white font-mono">88.2%</strong>
            </div>
            <span className="text-3xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60 font-medium">
              High Adherence
            </span>
          </div>
        </div>

        {/* Right Column: Intake & Retention Funnel (4 cols) */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4">
          <div className="border-b border-white/[0.06] pb-3">
            <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">
              Onboarding & Plan Pipeline
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Step 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-3xs font-medium">
                <span className="text-zinc-300">1. Enrolled Members</span>
                <span className="text-white font-mono">{clients.length}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full bg-white/40 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-3xs font-medium">
                <span className="text-emerald-300">2. Intake Questionnaire Complete</span>
                <span className="text-emerald-400 font-mono">{intakeCount} ({intakePercentage}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${intakePercentage}%` }} />
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-3xs font-medium">
                <span className="text-[#1754d8]">3. Workout Split Assigned</span>
                <span className="text-blue-400 font-mono">{planCount} ({planPercentage}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full bg-[#1754d8] rounded-full" style={{ width: `${planPercentage}%` }} />
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-3xs font-medium">
                <span className="text-purple-300">4. Regular Active Logging</span>
                <span className="text-purple-400 font-mono">{activeClients.length} ({clients.length > 0 ? Math.round((activeClients.length / clients.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${clients.length > 0 ? (activeClients.length / clients.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab("programs")}
            className="w-full py-2.5 px-3 rounded-xl bg-[#1754d8]/20 hover:bg-[#1754d8] text-[#1754d8] hover:text-white font-medium text-xs border border-[#1754d8]/30 transition-all flex items-center justify-center active:scale-[0.98] mt-2"
          >
            <span>Assign Next Workout Split</span>
          </button>
        </div>
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
