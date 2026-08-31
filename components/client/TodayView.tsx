"use client";

import React from "react";
import { Dumbbell, Utensils, ArrowRight, Flame, Target, Calendar, FileText, Download, CheckCircle2, Sparkles } from "lucide-react";
import { Client, Plan, DayOfWeek, DayRoutine } from "@/types/database";
import { normalizePlan, FormattedExercise, formatExercise } from "@/lib/utils/formatters";

interface TodayViewProps {
  client: Client;
  plan: Plan | null;
  isPro?: boolean;
  onNavigateToCheckin: () => void;
}

const DAYS: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TodayView({ client, plan: rawPlan, onNavigateToCheckin, isPro = false }: TodayViewProps) {
  const plan = normalizePlan(rawPlan);

  const currentDayIndex = new Date().getDay();
  const currentDayName = DAYS[currentDayIndex];

  // Find today's specific routine from schedule if present
  let todaySplitName = plan ? plan.split : "Your coach will assign your custom split shortly.";
  let todayExercises: FormattedExercise[] = plan?.exercises || [];

  if (rawPlan?.schedule && Array.isArray(rawPlan.schedule)) {
    const todayRoutine = rawPlan.schedule.find((r: DayRoutine) => r.day === currentDayName);
    if (todayRoutine) {
      todaySplitName = todayRoutine.splitName;
      if (todayRoutine.exercises && todayRoutine.exercises.length > 0) {
        todayExercises = todayRoutine.exercises.map(formatExercise);
      }
    }
  }

  const isRestDay = todaySplitName === "Rest Day";

  return (
    <div className="space-y-4 font-sans">
      {/* Coach's Directive Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1754d8]/15 via-black/40 to-transparent border border-[#1754d8]/30 shadow-lg space-y-1.5">
        <div className="flex items-center justify-between text-3xs">
          <span className="font-semibold text-[#1754d8] flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Coach Directive
          </span>
          <span className="text-zinc-400 font-mono">This Week's Focus</span>
        </div>
        <p className="text-xs text-zinc-200 font-normal leading-relaxed">
          {plan?.notes || "Welcome to your training block! Focus on strict form on heavy compound days and hit your protein target daily."}
        </p>
      </div>

      {/* Onboarding Status Timeline (if plan is pending) */}
      {!plan && (
        <div className="p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-white/[0.08] shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1754d8]" />
            <h3 className="text-sm font-display font-semibold text-white">Coaching Setup Status</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs">
                ✓
              </div>
              <div>
                <p className="text-xs font-medium text-white">Intake Questionnaire Complete</p>
                <p className="text-3xs text-zinc-500">Your physical stats, goals, and equipment preferences were submitted.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#1754d8]/20 text-[#1754d8] border border-[#1754d8]/40 flex items-center justify-center text-xs animate-pulse">
                ⏳
              </div>
              <div>
                <p className="text-xs font-medium text-white">Coach Reviewing Assessment</p>
                <p className="text-3xs text-zinc-500">Your custom workout split and nutrition targets are being finalized.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-6 h-6 rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.1] flex items-center justify-center text-xs">
                3
              </div>
              <div>
                <p className="text-xs font-medium text-white">First Training Split Published</p>
                <p className="text-3xs text-zinc-500">Your daily exercises and macro limits will appear right here.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Daily CTA Card - Frosted Glass UI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-white/[0.12]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xs uppercase tracking-wider font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
              {currentDayName} • {isRestDay ? "Rest & Recovery" : "Workout Scheduled"}
            </span>
          </div>
          <h2 className="text-base font-display font-semibold text-white tracking-tight">
            Log Today’s Check-In
          </h2>
          <p className="text-xs font-normal text-zinc-400 leading-relaxed">
            {isPro ? "Record bodyweight, progress photos, and macro nutrition targets." : "Record your bodyweight and training notes."}
          </p>
        </div>

        <button
          onClick={onNavigateToCheckin}
          className="py-2.5 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shrink-0 flex items-center justify-center gap-2 transition-all shadow-md shadow-[#1754d8]/25"
        >
          <span>Log Check-In</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* PDF Attachment Banner (If Coach attached a PDF Program) */}
      {rawPlan?.pdf_url && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1754d8]/20 via-black/40 to-transparent border border-[#1754d8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1754d8]/20 text-[#1754d8] border border-[#1754d8]/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-display font-semibold text-white">
                Coach Workout Guide (PDF Attached)
              </h4>
              <p className="text-3xs text-zinc-400">
                Your coach has provided an official PDF workout document for your program.
              </p>
            </div>
          </div>

          <a
            href={rawPlan.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="py-2 px-3.5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#1754d8]/25 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>View PDF Routine</span>
          </a>
        </div>
      )}

      {/* 7-Day Routine Schedule Overview (If Coach configured weekly schedule) */}
      {rawPlan?.schedule && rawPlan.schedule.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1754d8]" />
              <h3 className="text-xs font-display font-semibold text-white">
                7-Day Weekly Training Schedule
              </h3>
            </div>
            <span className="text-3xs text-zinc-400 font-mono">Today: {currentDayName}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-1">
            {DAYS.map((day) => {
              const sched = rawPlan.schedule?.find((s: DayRoutine) => s.day === day);
              const splitName = sched ? sched.splitName : "Rest Day";
              const isCurrent = day === currentDayName;
              const isRest = splitName === "Rest Day";

              return (
                <div
                  key={day}
                  className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                    isCurrent
                      ? "bg-[#1754d8]/15 border-[#1754d8]/50 text-white shadow-md shadow-[#1754d8]/15"
                      : "bg-white/[0.02] border-white/[0.04] text-zinc-400"
                  }`}
                >
                  <span className="text-3xs font-medium uppercase tracking-wider block">
                    {day.slice(0, 3)}
                  </span>
                  <p
                    className={`text-2xs truncate ${
                      isRest ? "text-zinc-500 font-normal" : "text-[#1754d8] font-medium"
                    }`}
                  >
                    {splitName}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Routine & Split - Frosted UI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <Dumbbell className="w-5 h-5 text-[#1754d8]" />
            <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">
              {todaySplitName}
            </h3>
          </div>

          <span className="text-3xs uppercase font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
            {isRestDay ? "Rest" : "Active Split"}
          </span>
        </div>

        {todayExercises && todayExercises.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-3xs uppercase font-medium tracking-wider text-zinc-500">
              Today's Prescribed Exercises ({todayExercises.length}):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {todayExercises.map((exercise: FormattedExercise, index: number) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-start gap-2.5 text-xs text-zinc-200"
                >
                  <span className="w-5 h-5 rounded-lg bg-black/40 text-zinc-400 flex items-center justify-center text-3xs font-mono shrink-0 mt-0.5 border border-white/[0.08]">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs truncate">{exercise.title}</p>
                    {exercise.subtitle && (
                      <p className="text-3xs text-[#ff6243] mt-0.5 font-mono font-normal">
                        {exercise.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isRestDay ? (
          <div className="text-center py-6 text-zinc-500 text-xs space-y-1">
            <Calendar className="w-6 h-6 mx-auto opacity-40 text-zinc-500" />
            <p className="text-xs font-medium text-zinc-300">Rest & Recovery Day</p>
            <p className="text-3xs font-normal">Hit your hydration and protein targets, stretch, and recover.</p>
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-500 text-xs space-y-1">
            <Dumbbell className="w-6 h-6 mx-auto opacity-40 text-zinc-500" />
            <p className="text-xs font-medium text-zinc-400">No workout split assigned yet</p>
            <p className="text-3xs font-normal">Your coach is reviewing your intake to customize your program.</p>
          </div>
        )}

        {plan?.notes && (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-2xs text-zinc-300 font-normal leading-relaxed">
            <strong className="text-zinc-400 block text-3xs uppercase font-medium mb-1">
              Coach Note & Instructions:
            </strong>
            {plan.notes}
          </div>
        )}
      </div>

      {isPro ? <>
      {/* Nutritional Macro & Micronutrient Targets - Frosted UI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/85 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1754d8]/15 text-[#1754d8] border border-[#1754d8]/30">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-semibold text-white tracking-tight">Daily Macro & Micro Targets</h3>
              <p className="text-3xs font-normal text-zinc-400 mt-0.5">Prescribed daily nutritional goals</p>
            </div>
          </div>

          <span className="text-3xs uppercase font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
            Daily Goal
          </span>
        </div>

        {plan ? (
          <div className="space-y-3">
            {/* Primary Macros */}
            <div>
              <span className="text-3xs uppercase tracking-wider text-zinc-500 font-medium block mb-1.5">
                Macronutrients
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-0.5">
                  <span className="text-3xs uppercase tracking-wider text-zinc-400 block font-normal">Calories</span>
                  <div className="text-base font-display font-semibold text-white font-mono">
                    {plan.calories || "—"}
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">kcal/day</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-emerald-500/20 text-center space-y-0.5">
                  <span className="text-3xs uppercase tracking-wider text-emerald-400 block font-normal">Protein</span>
                  <div className="text-base font-display font-semibold text-emerald-300 font-mono">
                    {plan.protein ? `${plan.protein}g` : "—"}
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">target</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-amber-500/20 text-center space-y-0.5">
                  <span className="text-3xs uppercase tracking-wider text-amber-400 block font-normal">Carbs</span>
                  <div className="text-base font-display font-semibold text-amber-300 font-mono">
                    {plan.carbs ? `${plan.carbs}g` : "—"}
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">target</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-sky-500/20 text-center space-y-0.5">
                  <span className="text-3xs uppercase tracking-wider text-sky-400 block font-normal">Fats</span>
                  <div className="text-base font-display font-semibold text-sky-300 font-mono">
                    {plan.fats ? `${plan.fats}g` : "—"}
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">target</span>
                </div>
              </div>
            </div>

            {/* Micronutrients: Sodium, Sugar, Fibre */}
            <div className="pt-2 border-t border-white/[0.04]">
              <span className="text-3xs uppercase tracking-wider text-zinc-500 font-medium block mb-1.5">
                Micronutrients & Daily Limits
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-purple-500/20 text-center space-y-0.5">
                  <span className="text-3xs uppercase tracking-wider text-purple-400 block font-normal">Sodium</span>
                  <div className="text-sm font-display font-semibold text-purple-300 font-mono">
                    {plan.sodium ? `${plan.sodium}mg` : "2300mg"}
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">limit</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-rose-500/20 text-center space-y-0.5">
                  <span className="text-3xs uppercase tracking-wider text-rose-400 block font-normal">Sugar</span>
                  <div className="text-sm font-display font-semibold text-rose-300 font-mono">
                    {plan.sugar ? `${plan.sugar}g` : "35g"}
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">limit</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-teal-500/20 text-center space-y-0.5">
                  <span className="text-3xs uppercase tracking-wider text-teal-400 block font-normal">Fiber</span>
                  <div className="text-sm font-display font-semibold text-teal-300 font-mono">
                    {plan.fiber ? `${plan.fiber}g` : "30g"}
                  </div>
                  <span className="text-3xs text-zinc-500 font-normal">target</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-500 text-xs">
            Nutrition targets will be configured once your coach designs your plan.
          </div>
        )}
      </div>
      </> : <p className="rounded-xl bg-darkCard p-4 text-xs text-zinc-400">Nutrition targets are a Pro feature. Previously recorded nutrition history remains in your check-ins.</p>}
    </div>
  );
}
