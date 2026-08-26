"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Dumbbell,
  History,
  TrendingUp,
  User,
  Utensils,
  ExternalLink,
  Flame,
  Award,
  Clock,
  Sparkles,
  Settings,
  Scale,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Client, Plan } from "@/types/database";
import { TodayView } from "@/components/client/TodayView";
import { CheckinForm } from "@/components/client/CheckinForm";
import { HistoryView } from "@/components/client/HistoryView";
import { IntakeForm } from "@/components/client/IntakeForm";
import { normalizePlan, FormattedExercise } from "@/lib/utils/formatters";
import { ToastNotification, ToastMessage } from "@/components/ui/ToastNotification";

interface ClientPortalProps {
  client?: Client;
  initialClient?: Client;
  initialPlan: Plan | null;
  experienceId: string;
}

type ClientNavTab = "today" | "checkin" | "history" | "split" | "settings";

export function ClientPortal({ client: clientProp, initialClient: initialClientProp, initialPlan, experienceId }: ClientPortalProps) {
  const initialClient = (clientProp || initialClientProp)!;
  const [client, setClient] = useState<Client>(initialClient);
  const [plan, setPlan] = useState<Plan | null>(initialPlan);
  const [activeTab, setActiveTab] = useState<ClientNavTab>("today");
  const [intakeDone, setIntakeDone] = useState(initialClient.intake_completed);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Client Personal Settings State
  const [displayName, setDisplayName] = useState(initialClient.display_name || initialClient.whop_user_id);
  const [unitsPreference, setUnitsPreference] = useState<"kg" | "lbs">(initialClient.units_preference || "kg");
  const [savingSettings, setSavingSettings] = useState(false);

  // If intake is not completed, show the onboarding intake form
  if (!intakeDone) {
    return (
      <main className="min-h-screen bg-[#111111] text-zinc-100 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-xl">
          <IntakeForm
            clientId={client.id}
            companyId={client.company_id}
            experienceId={experienceId}
            onComplete={() => {
              setIntakeDone(true);
              setClient({ ...client, intake_completed: true });
            }}
          />
        </div>
      </main>
    );
  }

  const handleSaveClientSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const res = await fetch("/api/client/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: client.company_id,
          clientId: client.id,
          experienceId,
          display_name: displayName.trim(),
          units_preference: unitsPreference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update preferences");
      }

      setClient(data.client);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Preferences Saved",
        message: "Your profile display name and units have been updated.",
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to save preferences",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const normalizedPlan = normalizePlan(plan);
  const memberName = client.display_name || client.whop_user_id;

  return (
    <div className="min-h-screen bg-[#111111] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-[#1754d8]/30 selection:text-white">
      {/* Toast Notification Container */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      {/* =========================================================================
          1. DESKTOP LEFT SIDEBAR NAVIGATION (md:flex)
          ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0c0c0e]/80 backdrop-blur-2xl border-r border-white/[0.08] min-h-screen p-5 sticky top-0 h-screen justify-between z-30 shadow-2xl">
        <div className="space-y-6">
          {/* Brand & Experience Header */}
          <div className="space-y-3">
            <div className="flex items-center px-1">
              <img src="/brand/fitz_logo.png" alt="Fitz Member Portal" className="h-8 w-auto object-contain" />
            </div>

            {/* Member Profile Card */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md space-y-1 hover:border-white/[0.12] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white truncate">
                  {memberName}
                </span>
              </div>
              <p className="text-3xs font-mono text-zinc-500 truncate font-normal">
                @{client.whop_user_id}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <p className="px-2 text-3xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
              Member Menu
            </p>

            <button
              onClick={() => setActiveTab("today")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "today"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className={`w-4 h-4 ${activeTab === "today" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Today's Program</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("checkin")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "checkin"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-4 h-4 ${activeTab === "checkin" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Log Check-In</span>
              </div>
              <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-[#1754d8]/20 text-[#1754d8] border border-[#1754d8]/30">
                Log
              </span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "history"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <History className={`w-4 h-4 ${activeTab === "history" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Check-In History</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("split")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] ${
                activeTab === "split"
                  ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/[0.12] backdrop-blur-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Dumbbell className={`w-4 h-4 ${activeTab === "split" ? "text-[#1754d8]" : "text-zinc-400"}`} />
                <span>Workout Split</span>
              </div>
            </button>

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
                <span>Preferences</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-3xs uppercase tracking-wider text-zinc-400 font-medium">Training Goal</span>
              <Sparkles className="w-3 h-3 text-[#1754d8]" />
            </div>
            <p className="text-xs font-medium text-white truncate">{client.goal || "Hypertrophy"}</p>
          </div>

          <a
            href="https://whop.com/hub/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-3xs text-zinc-300 transition-colors border border-white/[0.06]"
          >
            <span>Whop Hub</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CLIENT EXPERIENCE BODY
          ========================================================================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header Card */}
        <div className="p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                Welcome back, {memberName}
              </h1>
              <span className="text-3xs font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                {client.units_preference ? client.units_preference.toUpperCase() : "KG"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab("checkin")}
              className="py-2 px-3.5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-md shadow-[#1754d8]/25 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Log Check-In</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher Content */}
        <div className="animate-in fade-in">
          {activeTab === "today" && (
            <TodayView
              client={client}
              plan={plan}
              onNavigateToCheckin={() => setActiveTab("checkin")}
            />
          )}

          {activeTab === "checkin" && (
            <CheckinForm
              clientId={client.id}
              companyId={client.company_id}
              experienceId={experienceId}
              onCheckinComplete={() => {
                setActiveTab("history");
                setToast({
                  id: Date.now().toString(),
                  type: "success",
                  title: "Check-In Logged Successfully",
                  message: "Your progress metrics and physique photo have been submitted to your coach.",
                });
              }}
            />
          )}

          {activeTab === "history" && (
            <HistoryView client={client} experienceId={experienceId} />
          )}

          {activeTab === "split" && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Dumbbell className="w-5 h-5 text-[#1754d8]" />
                    <h2 className="text-lg font-display font-semibold text-white tracking-tight">
                      {normalizedPlan ? normalizedPlan.name : "Assigned Training Split"}
                    </h2>
                  </div>
                </div>

                {normalizedPlan && normalizedPlan.exercises && normalizedPlan.exercises.length > 0 ? (
                  <div className="space-y-2">
                    {normalizedPlan.exercises.map((ex: FormattedExercise, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-black/40 text-zinc-400 flex items-center justify-center text-3xs font-mono shrink-0 border border-white/[0.06]">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-white text-xs">{ex.title}</p>
                            {ex.subtitle && (
                              <p className="text-3xs text-zinc-400 font-mono font-normal mt-0.5">{ex.subtitle}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-500" />
                    <p className="font-medium text-zinc-400">No workout split assigned yet</p>
                    <p className="text-3xs font-normal text-zinc-500 mt-0.5">Your coach will assign your exercises and target volume shortly.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.06] pb-3">
                <h2 className="text-lg font-display font-semibold text-white tracking-tight">Member Preferences</h2>
                <p className="text-xs font-normal text-zinc-400 mt-0.5">
                  Configure your personal display name and measurement unit preferences.
                </p>
              </div>

              <form onSubmit={handleSaveClientSettings} className="space-y-5">
                {/* Personal Preferences Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                    <User className="w-4 h-4 text-[#1754d8]" />
                    <h3 className="text-sm font-display font-semibold text-white">Profile Basics</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400">
                      Your Name Shown to Coach
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[#1754d8]"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-[#1754d8]" />
                      Personal Weight Logging Units
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUnitsPreference("kg")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98] ${
                          unitsPreference === "kg"
                            ? "bg-[#1754d8] border-[#1754d8] text-white shadow-sm"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                        }`}
                      >
                        Kilograms (KG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnitsPreference("lbs")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98] ${
                          unitsPreference === "lbs"
                            ? "bg-[#1754d8] border-[#1754d8] text-white shadow-sm"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white"
                        }`}
                      >
                        Pounds (LBS)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="py-2.5 px-5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-md shadow-[#1754d8]/25 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving Preferences...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          3. MOBILE BOTTOM NAVIGATION TAB BAR (md:hidden)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-xl border-t border-white/[0.08] px-2 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab("today")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "today" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Calendar className="w-4 h-4 text-[#1754d8]" />
          <span>Today</span>
        </button>

        <button
          onClick={() => setActiveTab("checkin")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "checkin" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#1754d8]" />
          <span>Check In</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "history" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <History className="w-4 h-4 text-[#1754d8]" />
          <span>History</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-3xs font-medium transition-colors ${
            activeTab === "settings" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Settings className="w-4 h-4 text-[#1754d8]" />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
