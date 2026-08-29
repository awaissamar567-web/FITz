"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Activity,
  Settings,
  Flame,
  Radio,
  ExternalLink,
  Scale,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  Bell,
  CreditCard,
  User,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Dumbbell,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Checkin, Company, ClientStatus } from "@/types/database";
import { ClientListTable, EnrichedClient } from "@/components/coach/ClientListTable";
import { RealtimeActivityFeed } from "@/components/coach/RealtimeActivityFeed";
import { ClientProfileModal } from "@/components/coach/ClientProfileModal";
import { PlanAssignmentModal } from "@/components/coach/PlanAssignmentModal";
import { WorkoutProgramsView } from "@/components/coach/WorkoutProgramsView";
import { CoachAnalyticsDashboard } from "@/components/coach/CoachAnalyticsDashboard";
import { PaywallBanner } from "@/components/coach/PaywallBanner";
import { PaywallModal } from "@/components/coach/PaywallModal";
import { ToastNotification, ToastMessage } from "@/components/ui/ToastNotification";
import { FREE_TIER_CLIENT_LIMIT } from "@/lib/constants/plans";

interface CoachDashboardProps {
  companyId: string;
  company: Company | null;
  initialClients: EnrichedClient[];
  initialFeed?: any[];
  initialCheckins?: Checkin[];
  analyticsAsOf: string;
}

type CoachNavTab = "dashboard" | "clients" | "programs" | "feed" | "retention" | "settings";

export function CoachDashboard({
  companyId,
  company: initialCompany,
  initialClients,
  initialFeed = [],
  initialCheckins = [],
  analyticsAsOf,
}: CoachDashboardProps) {
  const [clients] = useState<EnrichedClient[]>(initialClients);
  const [company, setCompany] = useState<Company | null>(initialCompany);
  const [activeTab, setActiveTab] = useState<CoachNavTab>("dashboard");
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProfileClientId, setActiveProfileClientId] = useState<string | null>(null);
  const [activePlanClient, setActivePlanClient] = useState<EnrichedClient | null>(null);
  const [activeProgramClientId, setActiveProgramClientId] = useState<string | null>(
    initialClients.length > 0 ? initialClients[0].id : null
  );
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Retention Intervention Queue State
  const [snoozedClients, setSnoozedClients] = useState<Record<string, number>>({});
  const [contactedClients, setContactedClients] = useState<Record<string, string>>({});
  const [retentionFilter, setRetentionFilter] = useState<"all" | "overdue" | "intake" | "plan">("all");

  // Coach Settings Form State
  const [coachName, setCoachName] = useState(company?.coach_name || "");
  const [units, setUnits] = useState<"kg" | "lbs">(company?.units || "kg");
  const [checkinFrequency, setCheckinFrequency] = useState<"daily" | "weekly">(company?.default_checkin_frequency || "weekly");
  const [atRiskThreshold, setAtRiskThreshold] = useState<number>(company?.at_risk_threshold_days || 7);
  const [savingSettings, setSavingSettings] = useState(false);

  // Metrics
  const activeCount = clients.filter((c) => c.status === "active" || c.status === "at_risk").length;
  const atRiskClients = clients.filter(
    (c) =>
      c.status === "at_risk" ||
      (c.daysSinceLastCheckin != null &&
        c.daysSinceLastCheckin > (company?.at_risk_threshold_days || 7))
  );
  const atRiskCount = atRiskClients.length;

  // 4-Tier Operational Triage Queue
  const overdueClients = clients.filter(
    (c) =>
      c.status !== "cancelled" &&
      c.intake_completed &&
      c.daysSinceLastCheckin != null &&
      c.daysSinceLastCheckin >= (company?.at_risk_threshold_days || 7)
  );

  const intakePendingClients = clients.filter(
    (c) => c.status !== "cancelled" && !c.intake_completed
  );

  const missingPlanClients = clients.filter(
    (c) => c.status !== "cancelled" && c.intake_completed && !c.hasActivePlan
  );

  const totalInterventions = overdueClients.length + intakePendingClients.length + missingPlanClients.length;

  const isFreeTierCapped = company?.plan !== "pro" && activeCount >= FREE_TIER_CLIENT_LIMIT;

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const filteredClients = clients.filter((c) => {
    if (selectedStatus !== "all" && c.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesId = c.whop_user_id.toLowerCase().includes(q);
      const matchesGoal = c.goal && c.goal.toLowerCase().includes(q);
      const matchesName = (c as any).display_name && (c as any).display_name.toLowerCase().includes(q);
      if (!matchesId && !matchesGoal && !matchesName) return false;
    }
    return true;
  });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const res = await fetch("/api/coach/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          coach_name: coachName.trim(),
          units,
          default_checkin_frequency: checkinFrequency,
          at_risk_threshold_days: atRiskThreshold,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setCompany(data.company);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Settings Saved",
        message: "Coach workspace settings and defaults updated successfully.",
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to save workspace settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#1754d8]/30 selection:text-white">
      {/* Toast Notification Container */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      {/* =========================================================================
          1. DESKTOP LEFT SIDEBAR NAVIGATION (md:flex)
          ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0c0c0e]/80 backdrop-blur-2xl border-r border-white/[0.08] min-h-screen p-5 sticky top-0 h-screen justify-between z-30 shadow-2xl">
        <div className="space-y-6">
          {/* Brand & Workspace Header */}
          <div className="space-y-3">
            <div className="flex items-center px-1">
              <img src="/brand/fitz_logo.png" alt="Coach Dashboard" className="h-8 w-auto object-contain" />
            </div>

            {/* Coach Profile Card */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md space-y-1 hover:border-white/[0.12] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white truncate">
                  {company?.coach_name || "Coach workspace"}
                </span>
              </div>
              <p className="text-3xs font-mono text-zinc-500 truncate font-normal">
                {companyId}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <p className="px-2 text-3xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
              Workspace
            </p>

            {/* 1. Dashboard Tab */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "dashboard"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${activeTab === "dashboard" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Dashboard</span>
              </div>
            </button>

            {/* 2. Clients & Roster */}
            <button
              onClick={() => setActiveTab("clients")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "clients"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${activeTab === "clients" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Clients & Roster</span>
              </div>
              <span className="text-3xs font-mono text-zinc-500 font-normal">
                {activeCount}
              </span>
            </button>

            {/* 3. Workout Splits Builder */}
            <button
              onClick={() => setActiveTab("programs")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "programs"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Dumbbell className={`w-4 h-4 ${activeTab === "programs" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Workout Splits</span>
              </div>
            </button>

            {/* 4. Activity Feed */}
            <button
              onClick={() => setActiveTab("feed")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "feed"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className={`w-4 h-4 ${activeTab === "feed" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Activity Feed</span>
              </div>
            </button>

            {/* 5. Retention & Churn */}
            <button
              onClick={() => setActiveTab("retention")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "retention"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className={`w-4 h-4 ${activeTab === "retention" ? "text-amber-400" : "text-zinc-400"}`} />
                <span>Retention & Churn</span>
              </div>
              {atRiskCount > 0 && (
                <span className="text-3xs font-mono text-amber-400">
                  {atRiskCount}
                </span>
              )}
            </button>

            {/* 6. Settings */}
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "settings"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className={`w-4 h-4 ${activeTab === "settings" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Coach Settings</span>
              </div>
            </button>

            <div className="mt-2 border-t border-white/[0.06] pt-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh dashboard data"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-normal text-zinc-400 transition-[color,background-color,opacity,transform] duration-150 hover:bg-white/[0.03] hover:text-zinc-200 active:scale-[0.96] disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`}
                  strokeWidth={1.5}
                />
                <span>{isRefreshing ? "Refreshing…" : "Refresh data"}</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer: Tier Status & Whop Portal */}
        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          {company?.plan === "pro" ? (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#1754d8]/20 via-[#1754d8]/10 to-transparent border border-[#1754d8]/40 space-y-2 shadow-lg shadow-[#1754d8]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#3b82f6] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  FITz Pro Active
                </div>
                <span className="text-3xs uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1754d8]/30 text-[#60a5fa] font-mono font-medium">PRO</span>
              </div>
              <p className="text-3xs text-zinc-300 font-normal">Unlimited client capacity & real-time telemetry active</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xs uppercase tracking-wider text-amber-400 font-medium">Free Tier</span>
                <span className="text-3xs text-amber-300 font-mono font-medium">{activeCount}/{FREE_TIER_CLIENT_LIMIT} Clients</span>
              </div>
              <div className="w-full bg-black/40 rounded-md h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    activeCount >= FREE_TIER_CLIENT_LIMIT ? "bg-amber-400" : "bg-[#1754d8]"
                  }`}
                  style={{ width: `${Math.min(100, (activeCount / FREE_TIER_CLIENT_LIMIT) * 100)}%` }}
                />
              </div>
              <button
                onClick={() => setIsPaywallOpen(true)}
                className="w-full py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white text-3xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Upgrade to Pro
              </button>
            </div>
          )}

          <a
            href="https://whop.com/hub/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-2.5 py-1.5 text-3xs text-zinc-400 hover:text-white transition-colors"
          >
            <span>Whop Hub</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN COACH WORKSPACE BODY (Full Responsive Width)
          ========================================================================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Paywall Banner if Free Tier Reached Cap */}
        {isFreeTierCapped && (
          <PaywallBanner
            activeCount={activeCount}
            limit={FREE_TIER_CLIENT_LIMIT}
            onOpenUpgrade={() => setIsPaywallOpen(true)}
          />
        )}

        {/* -----------------------------------------------------------------------
            TAB 0: DEDICATED DASHBOARD (ANALYTICS, GROWTH, GRAPHS & OVERVIEW)
            ----------------------------------------------------------------------- */}
        {activeTab === "dashboard" && (
          <CoachAnalyticsDashboard
            companyId={companyId}
            company={company}
            clients={clients}
            checkins={initialCheckins}
            analyticsAsOf={analyticsAsOf}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onSelectClient={(clientId) => setActiveProfileClientId(clientId)}
          />
        )}

        {/* -----------------------------------------------------------------------
            TAB 1: DEDICATED CLIENTS & ROSTER VIEW
            ----------------------------------------------------------------------- */}
        {activeTab === "clients" && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-lg font-display font-semibold text-white tracking-tight">
                Client Roster Directory
              </h2>
              <p className="text-xs font-normal text-zinc-400 mt-0.5">
                Manage all enrolled coaching members, physical statistics, and customized routine assignments.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client List (Spans 2 cols on wide screens) */}
              <div className="lg:col-span-2">
                <ClientListTable
                  clients={filteredClients}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectClient={(clientId) => setActiveProfileClientId(clientId)}
                  onAssignPlan={(client) => {
                    setActiveProgramClientId(client.id);
                    setActiveTab("programs");
                  }}
                />
              </div>

              {/* Live Realtime Activity Feed (1 col on wide screens) */}
              <div className="lg:col-span-1">
                <RealtimeActivityFeed
                  companyId={companyId}
                  initialFeed={initialFeed}
                  onSelectClient={(clientId) => setActiveProfileClientId(clientId)}
                />
              </div>
            </div>
          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 2: WORKOUT SPLITS & 7-DAY ROUTINE BUILDER
            ----------------------------------------------------------------------- */}
        {activeTab === "programs" && (
          <WorkoutProgramsView
            companyId={companyId}
            clients={clients}
            preSelectedClientId={activeProgramClientId}
          />
        )}

        {/* -----------------------------------------------------------------------
            TAB 3: STANDALONE ACTIVITY FEED VIEW
            ----------------------------------------------------------------------- */}
        {activeTab === "feed" && (
          <div className="space-y-4">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Live Activity Feed</h2>
            </div>
            <RealtimeActivityFeed
              companyId={companyId}
              initialFeed={initialFeed}
              onSelectClient={(clientId) => setActiveProfileClientId(clientId)}
            />
          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 4: OPERATIONAL RETENTION & CHURN INTERVENTION QUEUE
            ----------------------------------------------------------------------- */}
        {activeTab === "retention" && (
          <div className="space-y-6">
            {/* Header & KPI Summary Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <Flame className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                    Retention & Churn Triage
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Active member interventions prioritized by churn risk, intake delays, and plan gaps.
                </p>
              </div>

              {/* Quick Stat Pill */}
              <div className="flex items-center gap-3 bg-[#0c0c0e]/80 border border-white/[0.08] p-2 rounded-2xl">
                <div className="px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-800/60 text-center">
                  <span className="text-3xs text-amber-400 block font-medium uppercase">Urgent Items</span>
                  <span className="text-sm font-bold text-white font-mono">{totalInterventions}</span>
                </div>
                <div className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-center">
                  <span className="text-3xs text-emerald-400 block font-medium uppercase">MRR Protected</span>
                  <span className="text-sm font-bold text-white font-mono">${overdueClients.length * 50}/mo</span>
                </div>
              </div>
            </div>

            {/* Segmented Triage Filter Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "all", label: `All Action Items (${totalInterventions})` },
                { id: "overdue", label: `⚠️ Missed Check-Ins (${overdueClients.length})` },
                { id: "intake", label: `📋 Intake Pending (${intakePendingClients.length})` },
                { id: "plan", label: `⚡ Missing Plan (${missingPlanClients.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRetentionFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                    retentionFilter === tab.id
                      ? "bg-[#1754d8] text-white shadow-md shadow-[#1754d8]/25"
                      : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Triage Items List */}
            {totalInterventions === 0 ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] text-center space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400" />
                <h3 className="text-base font-display font-semibold text-white">Zero At-Risk Members</h3>
                <p className="text-xs font-normal text-zinc-400 max-w-sm mx-auto">
                  Every active member has an assigned plan, completed intake, and is logging check-ins on schedule!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Missed Check-ins (Overdue > 7d) */}
                {(retentionFilter === "all" || retentionFilter === "overdue") &&
                  overdueClients.map((c) => {
                    const isSnoozed = snoozedClients[c.id] && snoozedClients[c.id] > Date.now();
                    const isContacted = contactedClients[c.id];
                    return (
                      <div
                        key={`overdue-${c.id}`}
                        className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-amber-800/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-amber-500/60"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-sm font-display font-semibold text-white">
                              {(c as any).display_name || c.whop_user_id}
                            </span>
                            <span className="text-3xs font-mono text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06]">
                              @{c.whop_user_id}
                            </span>
                            <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/60">
                              ⚠️ {c.daysSinceLastCheckin}d Since Last Check-In
                            </span>
                            {isContacted && (
                              <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                                ✓ Reached Out
                              </span>
                            )}
                            {isSnoozed && (
                              <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                                ⏳ Snoozed
                              </span>
                            )}
                          </div>
                          <p className="text-2xs text-zinc-400">
                            <strong>Reason:</strong> Missed weekly check-in schedule. At immediate risk of subscription churn.
                          </p>
                          <p className="text-3xs text-zinc-500 italic">
                            Suggested DM: "Hey {(c as any).display_name || c.whop_user_id}, noticed you missed your check-in. Everything okay with training? Let me know how I can help adjust your split!"
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button
                            onClick={() => {
                              setContactedClients((prev) => ({ ...prev, [c.id]: "today" }));
                              setToast({
                                id: Date.now().toString(),
                                type: "success",
                                title: "Outreach Logged",
                                message: `Marked outreach complete for ${(c as any).display_name || c.whop_user_id}.`,
                              });
                            }}
                            className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-white text-xs font-medium transition-colors border border-white/[0.08]"
                          >
                            Mark Contacted
                          </button>
                          <button
                            onClick={() => {
                              setSnoozedClients((prev) => ({ ...prev, [c.id]: Date.now() + 7 * 86400000 }));
                              setToast({
                                id: Date.now().toString(),
                                type: "info",
                                title: "Member Snoozed",
                                message: `Snoozed alerts for ${(c as any).display_name || c.whop_user_id} for 7 days.`,
                              });
                            }}
                            className="py-2 px-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-xs font-medium transition-colors border border-white/[0.06]"
                          >
                            Snooze 7d
                          </button>
                          <a
                            href={`https://whop.com/messages/?to_user_id=${c.whop_user_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>1-Click Whop DM</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}

                {/* 2. Intake Pending (>24h since join) */}
                {(retentionFilter === "all" || retentionFilter === "intake") &&
                  intakePendingClients.map((c) => (
                    <div
                      key={`intake-${c.id}`}
                      className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-sky-800/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-sky-500/60"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-display font-semibold text-white">
                            {(c as any).display_name || c.whop_user_id}
                          </span>
                          <span className="text-3xs font-mono text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06]">
                            @{c.whop_user_id}
                          </span>
                          <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-800/60">
                            📋 Intake Incomplete
                          </span>
                        </div>
                        <p className="text-2xs text-zinc-400">
                          <strong>Reason:</strong> Joined coaching workspace but has not submitted intake assessment questionnaire.
                        </p>
                        <p className="text-3xs text-zinc-500 italic">
                          Suggested DM: "Hey {(c as any).display_name || c.whop_user_id}! Welcome to the coaching program. Please fill out your quick 2-step intake questionnaire in your portal so I can design your training block!"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`https://whop.com/messages/?to_user_id=${c.whop_user_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-sky-600/20"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Prompt via Whop DM</span>
                        </a>
                      </div>
                    </div>
                  ))}

                {/* 3. Missing Plan (Intake complete, but no workout routine assigned) */}
                {(retentionFilter === "all" || retentionFilter === "plan") &&
                  missingPlanClients.map((c) => (
                    <div
                      key={`plan-${c.id}`}
                      className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-purple-800/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-purple-500/60"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-display font-semibold text-white">
                            {(c as any).display_name || c.whop_user_id}
                          </span>
                          <span className="text-3xs font-mono text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06]">
                            @{c.whop_user_id}
                          </span>
                          <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60">
                            ⚡ Awaiting Workout Split
                          </span>
                        </div>
                        <p className="text-2xs text-zinc-400">
                          <strong>Reason:</strong> Intake completed with goal:{" "}
                          <span className="text-zinc-200 font-medium">{c.goal || "General Fitness"}</span>. Member is waiting for their first workout routine.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setActiveProgramClientId(c.id);
                            setActiveTab("programs");
                          }}
                          className="py-2 px-3.5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-[#1754d8]/25"
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          <span>Assign Workout Split</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 5: COACH WORKSPACE SETTINGS
            ----------------------------------------------------------------------- */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Coach Settings</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Section 1: Coaching Defaults */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Calendar className="w-4 h-4 text-[#1754d8]" />
                  <h3 className="text-sm font-display font-semibold text-white">Coaching Defaults</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Default Check-In Frequency */}
                  <div className="space-y-1.5">
                    <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400">
                      Default Check-In Frequency
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCheckinFrequency("weekly")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98] ${
                          checkinFrequency === "weekly"
                            ? "bg-[#1754d8] border-[#1754d8] text-white shadow-sm"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckinFrequency("daily")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98] ${
                          checkinFrequency === "daily"
                            ? "bg-[#1754d8] border-[#1754d8] text-white shadow-sm"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                        }`}
                      >
                        Daily
                      </button>
                    </div>
                  </div>

                  {/* Measurement Units */}
                  <div className="space-y-1.5">
                    <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400">
                      Measurement Units
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUnits("kg")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98] ${
                          units === "kg"
                            ? "bg-[#1754d8] border-[#1754d8] text-white shadow-sm"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                        }`}
                      >
                        KG (Metric)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnits("lbs")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98] ${
                          units === "lbs"
                            ? "bg-[#1754d8] border-[#1754d8] text-white shadow-sm"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                        }`}
                      >
                        LBS (Imperial)
                      </button>
                    </div>
                  </div>
                </div>

                {/* At-Risk Threshold Slider */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <label className="text-3xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      At-Risk Inactivity Threshold
                    </label>
                    <span className="text-xs font-mono font-medium text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/60">
                      {atRiskThreshold} Days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="14"
                    step="1"
                    value={atRiskThreshold}
                    onChange={(e) => setAtRiskThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/[0.08] rounded-md appearance-none cursor-pointer accent-[#1754d8]"
                  />
                  <div className="flex justify-between text-3xs font-mono text-zinc-500">
                    <span>3 days (Strict)</span>
                    <span>7 days (Recommended)</span>
                    <span>14 days (Relaxed)</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Coach Profile & Branding */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <User className="w-4 h-4 text-[#1754d8]" />
                  <h3 className="text-sm font-display font-semibold text-white">Profile & Branding</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400">
                    Display Name / Coaching Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    placeholder="Your coaching name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[#1754d8]"
                  />
                  <p className="text-3xs text-zinc-500 font-normal">This name is displayed to your clients across their portal views.</p>
                </div>
              </div>

              {/* Section 3: Billing & Subscriptions */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#1754d8]" />
                    <h3 className="text-sm font-display font-semibold text-white">Billing & Subscriptions</h3>
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">Powered by Whop</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <span className="text-3xs uppercase tracking-wider text-zinc-400 font-medium">Current Plan</span>
                    <div className="text-base font-display font-semibold text-white capitalize">
                      {company?.plan || "Free"} Tier
                    </div>
                    <p className="text-3xs text-zinc-400 font-normal">
                      {company?.plan === "pro"
                        ? "Unlimited client capacity & real-time analytics"
                        : `${FREE_TIER_CLIENT_LIMIT} client capacity cap`}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-3xs uppercase tracking-wider text-zinc-400 font-medium">Whop Invoicing & Payment</span>
                      <p className="text-3xs text-zinc-400 font-normal mt-0.5">Manage payment methods & invoices directly in your Whop hub.</p>
                    </div>
                    <a
                      href="https://whop.com/hub/"
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/[0.08]"
                    >
                      <span>Open Whop Billing Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Save CTA */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="py-2.5 px-5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-md shadow-[#1754d8]/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Workspace Settings...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Workspace Settings
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* =========================================================================
          3. MOBILE BOTTOM NAVIGATION TAB BAR (md:hidden)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-xl border-t border-white/[0.08] px-2 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "dashboard" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#1754d8]" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab("clients")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "clients" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="w-4 h-4 text-[#1754d8]" />
          <span>Clients</span>
        </button>

        <button
          onClick={() => setActiveTab("programs")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "programs" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Dumbbell className="w-4 h-4 text-[#1754d8]" />
          <span>Splits</span>
        </button>

        <button
          onClick={() => setActiveTab("feed")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "feed" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Activity className="w-4 h-4 text-[#1754d8]" />
          <span>Feed</span>
        </button>

        <button
          onClick={() => setActiveTab("retention")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "retention" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Retention</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "settings" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Settings className="w-4 h-4 text-[#1754d8]" />
          <span>Settings</span>
        </button>
      </nav>

      {/* =========================================================================
          4. MODALS & OVERLAYS
          ========================================================================= */}
      {activeProfileClientId && (
        <ClientProfileModal
          companyId={companyId}
          clientId={activeProfileClientId}
          onClose={() => setActiveProfileClientId(null)}
        />
      )}

      {activePlanClient && (
        <PlanAssignmentModal
          companyId={companyId}
          client={activePlanClient}
          onClose={() => setActivePlanClient(null)}
          onSuccess={() => {
            setActivePlanClient(null);
          }}
        />
      )}

      {isPaywallOpen && (
        <PaywallModal
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          companyId={companyId}
          activeCount={activeCount}
          onSuccess={() => {
            setIsPaywallOpen(false);
            if (company) {
              setCompany({ ...company, plan: "pro" });
            }
            setToast({
              id: Date.now().toString(),
              type: "success",
              title: "Upgraded to FITz Pro!",
              message: "Unlimited client capacity & real-time telemetry are now active.",
            });
          }}
        />
      )}
    </div>
  );
}
