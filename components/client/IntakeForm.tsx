"use client";

import React, { useState } from "react";
import { User, Dumbbell, Target, AlertCircle, ArrowRight, Loader2, Scale, Activity } from "lucide-react";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";

interface IntakeFormProps {
  clientId: string;
  companyId: string;
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

export function IntakeForm({ clientId, companyId, onComplete }: IntakeFormProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        companyId,
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

      onComplete();
    } catch (err: any) {
      setError(err.message || "Failed to submit intake profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.12] bg-[#0c0c0e]/95 backdrop-blur-2xl shadow-2xl text-zinc-100 space-y-5 font-sans">
      {/* Header */}
      <div className="space-y-2 text-center flex flex-col items-center">
        <img src="/brand/fitz_logo.png" alt="FITz" className="h-9 w-auto object-contain mx-auto" />
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
          Client Onboarding Intake
        </h1>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center gap-2 text-red-300 text-xs font-normal">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Physical Stats Grid */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-white font-medium border-b border-white/[0.04] pb-2">
            <User className="w-4 h-4 text-[#1754d8]" />
            <span>Member Profile & Demographics</span>
          </div>

          {/* Full Name Input */}
          <div>
            <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Your Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Age
              </label>
              <input
                type="number"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
              />
            </div>

            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Gender
              </label>
              <CustomSelect
                value={gender}
                onChange={(val) => setGender(val)}
                options={GENDER_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
              />
            </div>

            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                required
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
              />
            </div>
          </div>
        </div>

        {/* Training Objectives */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2 text-white font-medium border-b border-white/[0.04] pb-2">
            <Target className="w-4 h-4 text-[#1754d8]" />
            <span>Training & Routine Goals</span>
          </div>

          <div className="space-y-3">
            {/* Primary Fitness Goal Dropdown */}
            <div>
              <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Primary Fitness Goal
              </label>
              <CustomSelect
                value={goal}
                onChange={(val) => setGoal(val)}
                options={GOAL_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Equipment Access
                </label>
                <CustomSelect
                  value={equipment}
                  onChange={(val) => setEquipment(val)}
                  options={EQUIPMENT_OPTIONS}
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Preferred Training Days
                </label>
                <CustomSelect
                  value={String(daysPerWeek)}
                  onChange={(val) => setDaysPerWeek(parseInt(val, 10))}
                  options={DAYS_OPTIONS}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Injuries & Limitations */}
        <div>
          <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
            Injuries or Movement Limitations (optional)
          </label>
          <textarea
            rows={2}
            value={limitations}
            onChange={(e) => setLimitations(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8] leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-md shadow-[#1754d8]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving Onboarding Profile...
            </>
          ) : (
            <>
              <span>Complete Member Intake</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
