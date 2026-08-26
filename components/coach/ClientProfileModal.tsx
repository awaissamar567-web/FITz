"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  AlertTriangle,
  MessageSquare,
  History,
  ChevronDown,
  PlusCircle,
  ExternalLink,
  User,
  Dumbbell,
  Calendar,
  Scale,
  Sparkles,
  Utensils,
  Camera,
} from "lucide-react";
import { PlanAssignmentModal } from "./PlanAssignmentModal";
import { normalizePlan, FormattedExercise } from "@/lib/utils/formatters";

interface ClientProfileModalProps {
  companyId: string;
  clientId: string;
  onClose: () => void;
}

export function ClientProfileModal({ companyId, clientId, onClose }: ClientProfileModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const checkinsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/coach/clients/${clientId}?companyId=${companyId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [clientId, companyId]);

  const scrollToHistory = () => {
    if (checkinsSectionRef.current) {
      checkinsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!data && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
        <div className="p-6 rounded-2xl bg-[#0c0c0e]/90 border border-white/[0.08] text-zinc-300 text-sm font-normal">
          Loading Member Profile...
        </div>
      </div>
    );
  }

  const { client, plan: rawPlan, checkins = [] } = data || {};
  const plan = normalizePlan(rawPlan);
  const isAtRisk = client?.status === "at_risk";

  const latestCheckin = checkins.length > 0 ? checkins[0] : null;
  const currentWeight = latestCheckin?.weight || client?.stats?.currentWeight || client?.weight_kg || null;
  const displayName = client?.display_name || client?.whop_user_id || "Client";
  const heightDisplay = client?.stats?.height || (client?.height_cm ? `${client.height_cm} cm` : "—");
  const ageDisplay = client?.stats?.age ? `${client.stats.age} yrs` : "—";
  const genderDisplay = client?.stats?.gender || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in font-sans">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#0c0c0e]/95 backdrop-blur-2xl text-zinc-100 shadow-2xl p-5 sm:p-7 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1754d8]/15 border border-[#1754d8]/30 flex items-center justify-center text-[#1754d8] font-display font-semibold text-lg shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-display font-semibold text-white tracking-tight">
                  {displayName}
                </h2>
                <span className="font-mono text-xs text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                  @{client?.whop_user_id}
                </span>
                <span
                  className={`text-3xs font-medium px-2 py-0.5 rounded-md capitalize ${
                    client?.status === "active"
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                      : isAtRisk
                      ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {client?.status === "at_risk" ? "⚠️ At Risk (>7d)" : client?.status || "active"}
                </span>
              </div>
              <p className="text-3xs font-normal text-zinc-400 mt-1">
                Joined: {client ? new Date(client.joined_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors border border-white/[0.08]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Churn Warning if At Risk */}
        {isAtRisk && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-300 font-normal">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Client is at risk of churning due to missed check-ins (over 7 days).</span>
            </div>
            <a
              href={`https://whop.com/messages/?user=${client?.whop_user_id}`}
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Direct Message
            </a>
          </div>
        )}

        {/* Quick Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={scrollToHistory}
            className="py-2 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] text-white font-medium text-xs border border-white/[0.08] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-[#1754d8]" />
            <span>See Checkins ({checkins.length})</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          <button
            onClick={() => setIsEditingPlan(true)}
            className="py-2 px-3.5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-md shadow-[#1754d8]/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{plan ? "Edit Routine Split" : "Assign Workout Split"}</span>
          </button>

          <a
            href={`https://whop.com/messages/?user=${client?.whop_user_id}`}
            target="_blank"
            rel="noreferrer"
            className="py-2 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-zinc-300 hover:text-white font-medium text-xs border border-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>Message on Whop</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>

        {/* Demographics & Physical Stats Grid */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <h3 className="text-xs font-display font-semibold text-white flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#1754d8]" />
              Member Demographics & Physical Stats
            </h3>
            <span
              className={`text-3xs font-medium px-2 py-0.5 rounded-md ${
                client?.intake_completed
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                  : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
              }`}
            >
              {client?.intake_completed ? "Intake Completed" : "Intake Incomplete"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Name</span>
              <span className="font-medium text-white text-xs">{displayName}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Age</span>
              <span className="font-medium text-white text-xs">{ageDisplay}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Gender</span>
              <span className="font-medium text-white text-xs">{genderDisplay}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Current Weight</span>
              <span className="font-medium text-[#1754d8] text-xs font-mono">
                {currentWeight ? `${currentWeight} kg` : "—"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Height</span>
              <span className="font-medium text-white text-xs">{heightDisplay}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Primary Goal</span>
              <span className="font-medium text-white text-xs">{client?.goal || "General Fitness"}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Equipment Access</span>
              <span className="font-medium text-white text-xs capitalize">{client?.equipment?.equipment || "Gym"}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-3xs text-zinc-500 block font-normal mb-0.5">Training Days</span>
              <span className="font-medium text-white text-xs">{client?.equipment?.daysPerWeek ? `${client.equipment.daysPerWeek}d/week` : "4d/week"}</span>
            </div>
          </div>

          {client?.limitations && (
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs">
              <span className="text-3xs font-medium uppercase tracking-wider text-amber-400 block mb-0.5">
                Injuries & Movement Limitations:
              </span>
              <p className="text-2xs text-amber-200/90 font-normal leading-relaxed">{client.limitations}</p>
            </div>
          )}
        </div>

        {/* Workout Plan & Nutrition Targets */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <h3 className="text-xs font-display font-semibold text-white flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5 text-[#1754d8]" />
              Assigned Routine & Split
            </h3>
            {plan && (
              <span className="text-3xs font-mono text-zinc-400">
                Split: {plan.split}
              </span>
            )}
          </div>

          {plan ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-white">{plan.name}</h4>
                {plan.notes && (
                  <p className="text-2xs text-zinc-400 font-normal mt-0.5">{plan.notes}</p>
                )}
              </div>

              {plan.exercises && plan.exercises.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {plan.exercises.map((ex: FormattedExercise, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-lg bg-black/40 text-zinc-500 flex items-center justify-center text-3xs font-mono shrink-0 mt-0.5 border border-white/[0.06]">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-white text-xs">{ex.title}</p>
                        {ex.subtitle && (
                          <p className="text-3xs text-zinc-400 font-mono font-normal mt-0.5">{ex.subtitle}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Macro Targets */}
              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-3xs text-zinc-500 block font-normal">Calories</span>
                  <span className="font-mono font-medium text-white">{plan.calories || "—"}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-emerald-500/20">
                  <span className="text-3xs text-emerald-400 block font-normal">Protein</span>
                  <span className="font-mono font-medium text-emerald-300">{plan.protein ? `${plan.protein}g` : "—"}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-amber-500/20">
                  <span className="text-3xs text-amber-400 block font-normal">Carbs</span>
                  <span className="font-mono font-medium text-amber-300">{plan.carbs ? `${plan.carbs}g` : "—"}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-sky-500/20">
                  <span className="text-3xs text-sky-400 block font-normal">Fats</span>
                  <span className="font-mono font-medium text-sky-300">{plan.fats ? `${plan.fats}g` : "—"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-500 text-xs">
              <Dumbbell className="w-5 h-5 mx-auto mb-1 opacity-50" />
              <p className="font-normal">No workout split assigned to this member yet.</p>
            </div>
          )}
        </div>

        {/* Check-In History Timeline & Progress Photos */}
        <div ref={checkinsSectionRef} className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <h3 className="text-xs font-display font-semibold text-white flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-[#1754d8]" />
              Check-In History & Photo Timeline ({checkins.length})
            </h3>
            <span className="text-3xs font-mono text-zinc-500">
              Latest: {latestCheckin?.date || "None"}
            </span>
          </div>

          {checkins.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              <Calendar className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-zinc-500" />
              <p className="font-medium text-zinc-400">No Check-Ins Submitted Yet</p>
              <p className="text-3xs font-normal text-zinc-500 mt-0.5">Check-in submissions with photos and reflections will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.map((chk: any) => (
                <div
                  key={chk.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {chk.date}
                    </span>
                    <div className="flex items-center gap-2">
                      {chk.weight && (
                        <span className="text-xs font-mono font-medium text-[#1754d8]">
                          {chk.weight} kg
                        </span>
                      )}
                      {chk.macro_hit && (
                        <span
                          className={`text-3xs font-medium px-2 py-0.5 rounded-md ${
                            chk.macro_hit.hitTarget
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                              : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                          }`}
                        >
                          {chk.macro_hit.hitTarget ? "Macros Hit" : "Macros Off"}
                        </span>
                      )}
                    </div>
                  </div>

                  {chk.notes && (
                    <p className="text-2xs text-zinc-300 italic font-normal bg-black/20 p-2.5 rounded-lg border border-white/[0.04]">
                      "{chk.notes}"
                    </p>
                  )}

                  {chk.photo_url && (
                    <div className="pt-1">
                      <img
                        src={chk.photo_url}
                        alt="Progress Check-In"
                        className="w-full h-48 object-cover rounded-xl border border-white/[0.08]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plan Assignment Sub-Modal */}
      {isEditingPlan && client && (
        <PlanAssignmentModal
          companyId={companyId}
          client={client}
          onClose={() => setIsEditingPlan(false)}
          onSuccess={() => {
            setIsEditingPlan(false);
            // Re-fetch profile
            fetch(`/api/coach/clients/${clientId}?companyId=${companyId}`)
              .then((r) => r.json())
              .then((json) => setData(json));
          }}
        />
      )}
    </div>
  );
}
