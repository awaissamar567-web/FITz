"use client";

import React, { useState } from "react";
import { User, Dumbbell, Target, AlertCircle, ArrowRight, ArrowLeft, Loader2, Scale, Activity, CheckCircle2, Sparkles } from "lucide-react";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";

interface IntakeFormProps {
  clientId: string;
  companyId: string;
  experienceId: string;
  onComplete: () => void;
}

const GOAL_OPTIONS: SelectOption[] = [
  { value: "Muscle Building (Hypertrophy)", label: "Muscle Building (Hypertrophy)", description: "Maximal muscle growth & aesthetic hypertrophy" },
  { value: "Fat Loss & Body Recomposition", label: "Fat Loss & Body Recomposition", description: "Shed body fat while preserving lean tissue" },
  { value: "Strength & Powerlifting", label: "Strength & Powerlifting", description: "Increase 1-rep max on heavy compound lifts" },
  { value: "Calisthenics & Bodyweight Training", label: "Calisthenics & Bodyweight Training", description: "Gymnastic strength, levers, muscle-ups & handstands" },
  { value: "Pilates & Mobility", label: "Pilates & Mobility", description: "Core stability, posture alignment & active flexibility" },
  { value: "General Health & Endurance", label: "General Health & Endurance", description: "Cardiovascular health, longevity & functional fitness" },
];

const GENDER_OPTIONS: SelectOption[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const EQUIPMENT_OPTIONS: SelectOption[] = [
  { value: "commercial_gym", label: "Commercial Gym (Full Equipment)", description: "Barbells, cables, dumbbells, and pin machines" },
  { value: "home_gym", label: "Home Gym (Barbell & Dumbbells)", description: "Squat rack, bench, barbell & free weights" },
  { value: "dumbbells_only", label: "Dumbbells & Resistance Bands", description: "Adjustable dumbbells & resistance loop bands" },
  { value: "bodyweight", label: "Bodyweight / Calisthenics", description: "Pull-up bar, dip bars, or floor space" },
];

const DAYS_OPTIONS: SelectOption[] = [
  { value: "2", label: "2 Days per Week" },
  { value: "3", label: "3 Days per Week" },
  { value: "4", label: "4 Days per Week" },
  { value: "5", label: "5 Days per Week" },
  { value: "6", label: "6 Days per Week" },
];

export function IntakeForm({ clientId, companyId, experienceId, onComplete }: IntakeFormProps) {
  // Step state: 1 (Baseline & Goals) | 2 (Training Setup) | 3 (Complete Celebration)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = useState<string>("");
  const [goal, setGoal] = useState<string>("Muscle Building (Hypertrophy)");
  const [experience, setExperience] = useState<string>("intermediate");
  const [equipment, setEquipment] = useState<string>("commercial_gym");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [limitations, setLimitations] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("Male");
  const [weightKg, setWeightKg] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please enter your full name to proceed.");
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        companyId,
        experienceId,
        clientId,
        display_name: fullName.trim(),
        goal,
        experience,
        equipment: {
          equipment,
          daysPerWeek,
        },
        limitations: limitations.trim() || undefined,
        stats: {
          age: age ? parseInt(age) : undefined,
          gender: gender || undefined,
          currentWeight: weightKg ? parseFloat(weightKg) : undefined,
          height: heightCm ? `${heightCm} cm` : undefined,
        },
      };

      const res = await fetch("/api/client/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit intake");
      }

      setCurrentStep(3);
      setTimeout(() => {
        onComplete();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Failed to submit intake profile");
      setSubmitting(false);
    }
  };

  // Step 3: Celebration State
  if (currentStep === 3) {
    return (
      <div className="p-8 sm:p-10 rounded-2xl border border-emerald-500/30 bg-[#0c0c0e]/95 backdrop-blur-2xl shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            Profile Ready, {fullName}!
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Your onboarding assessment was submitted to your coach. Loading your training portal...
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-3xs text-emerald-400 font-mono">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Setting up your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.12] bg-[#0c0c0e]/95 backdrop-blur-2xl shadow-2xl text-zinc-100 space-y-5 font-sans">
      {/* Header with Step Progress */}
      <div className="space-y-3 text-center flex flex-col items-center">
        <img src="/brand/fitz_logo.png" alt="FITz" className="h-9 w-auto object-contain mx-auto" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Client Onboarding Intake
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {currentStep === 1
              ? "Step 1 of 2: Goals & Physical Baseline"
              : "Step 2 of 2: Training Environment & Equipment"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xs h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-[#1754d8] rounded-full transition-all duration-300 shadow-sm shadow-[#1754d8]/50"
            style={{ width: currentStep === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center gap-2 text-red-300 text-xs font-normal">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          STEP 1: GOALS & PHYSICAL STATS
          ========================================================================= */}
      {currentStep === 1 && (
        <form onSubmit={handleNextStep} className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2 text-white font-medium border-b border-white/[0.04] pb-2">
              <User className="w-4 h-4 text-[#1754d8]" />
              <span>Personal Details</span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Your Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
              />
            </div>

            {/* Primary Fitness Goal */}
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Primary Fitness Goal <span className="text-red-400">*</span>
              </label>
              <CustomSelect
                options={GOAL_OPTIONS}
                value={goal}
                onChange={setGoal}
                placeholder="Select your goal"
              />
            </div>

            {/* Stats Grid: Age, Gender, Weight, Height */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  placeholder="e.g. 26"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8]"
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Gender
                </label>
                <CustomSelect
                  options={GENDER_OPTIONS}
                  value={gender}
                  onChange={setGender}
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 82.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8]"
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 182"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#1754d8]/25"
          >
            <span>Next: Training Setup & Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* =========================================================================
          STEP 2: TRAINING ENVIRONMENT & SCHEDULE
          ========================================================================= */}
      {currentStep === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2 text-white font-medium border-b border-white/[0.04] pb-2">
              <Dumbbell className="w-4 h-4 text-[#1754d8]" />
              <span>Training Setup & Equipment</span>
            </div>

            {/* Equipment Access */}
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Gym & Free Weights Access <span className="text-red-400">*</span>
              </label>
              <CustomSelect
                options={EQUIPMENT_OPTIONS}
                value={equipment}
                onChange={setEquipment}
              />
            </div>

            {/* Days per week */}
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Training Days Available per Week <span className="text-red-400">*</span>
              </label>
              <CustomSelect
                options={DAYS_OPTIONS}
                value={daysPerWeek.toString()}
                onChange={(val) => setDaysPerWeek(parseInt(val, 10))}
              />
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Lifting Experience
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperience(lvl)}
                    className={`py-2 px-3 rounded-xl border capitalize text-xs transition-all ${
                      experience === lvl
                        ? "bg-[#1754d8] text-white border-[#1754d8] font-medium shadow-sm"
                        : "bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:bg-white/[0.05]"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Injuries or Limitations */}
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Injuries, Health Restrictions or Joint Issues
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Mild right shoulder tightness on heavy flat bench, lower back pinch"
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8] resize-none"
              />
            </div>
          </div>

          {/* Outcome Value Banner */}
          <div className="p-3 rounded-xl bg-[#1754d8]/10 border border-[#1754d8]/30 flex items-center gap-2.5 text-3xs text-zinc-300">
            <Sparkles className="w-4 h-4 text-[#1754d8] shrink-0" />
            <span>
              Your responses give your coach the context needed to build your training split, exercise selections, and daily macro targets.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#1754d8]/25 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Profile...</span>
                </>
              ) : (
                <>
                  <span>Complete Profile & Start Coaching</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
