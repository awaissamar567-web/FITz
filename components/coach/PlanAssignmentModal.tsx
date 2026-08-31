"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Dumbbell, Utensils, Save, Loader2, AlertCircle } from "lucide-react";
import { Client } from "@/types/database";

interface PlanAssignmentModalProps {
  companyId: string;
  isPro?: boolean;
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExerciseItem {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export function PlanAssignmentModal({ companyId, client, isPro = false, onClose, onSuccess }: PlanAssignmentModalProps) {
  const [planName, setPlanName] = useState<string>("Custom Workout");
  const [split, setSplit] = useState<string>("Upper / Lower");
  const [calories, setCalories] = useState<string>("2400");
  const [protein, setProtein] = useState<string>("180");
  const [carbs, setCarbs] = useState<string>("250");
  const [fats, setFats] = useState<string>("65");
  const [coachNotes, setCoachNotes] = useState<string>("Focus on progressive overload on compound lifts. Keep 2 reps in reserve.");

  const [exercises, setExercises] = useState<ExerciseItem[]>([
    { name: "", sets: 3, reps: "", notes: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddExercise = () => {
    setExercises([...exercises, { name: "", sets: 3, reps: "10-12", notes: "" }]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index: number, field: keyof ExerciseItem, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        companyId,
        clientId: client.id,
        split_name: planName.trim(),
        macros: isPro ? { calories: Number(calories), protein: Number(protein), carbs: Number(carbs), fat: Number(fats) } : undefined,
        schedule: [{ day: "Monday", splitName: split.trim(), notes: coachNotes.trim(), exercises: exercises.filter(ex => ex.name.trim()) }],
        exercises: exercises.filter((ex) => ex.name.trim().length > 0),
      };

      const res = await fetch("/api/coach/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign workout plan");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to assign plan");
    } finally {
      setSaving(false);
    }
  };

  const displayName = client.display_name || client.whop_user_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in font-sans">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#0c0c0e]/95 backdrop-blur-2xl text-zinc-100 shadow-2xl p-5 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-white tracking-tight">
              Assign Routine & Split
            </h2>
            <p className="text-xs font-normal text-zinc-400 mt-0.5">
              Configuring training split and macro nutritional targets for <span className="text-white font-medium">{displayName}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors border border-white/[0.08]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center gap-2 text-red-300 text-xs font-normal">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Plan Basics */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2 text-white font-medium border-b border-white/[0.04] pb-2">
              <Dumbbell className="w-4 h-4 text-[#1754d8]" />
              <span>Routine Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Plan Title
                </label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. 4-Day Hypertrophy"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#1754d8]"
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Split Cadence
                </label>
                <input
                  type="text"
                  required
                  value={split}
                  onChange={(e) => setSplit(e.target.value)}
                  placeholder="e.g. Upper / Lower or PPL"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#1754d8]"
                />
              </div>
            </div>
          </div>

          {/* Exercise List Builder */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <Dumbbell className="w-4 h-4 text-[#1754d8]" />
                <span>Prescribed Exercises ({exercises.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddExercise}
                className="py-1 px-2.5 rounded-lg bg-[#1754d8]/20 hover:bg-[#1754d8] text-[#1754d8] hover:text-white font-medium text-3xs border border-[#1754d8]/30 transition-all flex items-center gap-1 active:scale-[0.98]"
              >
                <Plus className="w-3 h-3" /> Add Exercise
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-lg bg-black/40 text-zinc-500 flex items-center justify-center text-3xs font-mono shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={ex.name}
                    onChange={(e) => handleExerciseChange(idx, "name", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#1754d8]"
                  />
                  <input
                    type="number"
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={(e) => handleExerciseChange(idx, "sets", parseInt(e.target.value) || 0)}
                    className="w-14 px-2 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-xs font-mono text-center"
                  />
                  <input
                    type="text"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => handleExerciseChange(idx, "reps", e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-xs font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(idx)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/[0.04] transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {isPro ? <>
          {/* Daily Nutritional Macro Targets */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2 text-white font-medium border-b border-white/[0.04] pb-2">
              <Utensils className="w-4 h-4 text-[#1754d8]" />
              <span>Daily Macro Targets</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
                  Calories
                </label>
                <input
                  type="number"
                  placeholder="2400"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-emerald-400 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  placeholder="180"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl border border-emerald-500/30 bg-white/[0.03] text-emerald-300 text-xs font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-amber-400 mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  placeholder="250"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl border border-amber-500/30 bg-white/[0.03] text-amber-300 text-xs font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-3xs font-medium uppercase tracking-wider text-sky-400 mb-1">
                  Fats (g)
                </label>
                <input
                  type="number"
                  placeholder="65"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl border border-sky-500/30 bg-white/[0.03] text-sky-300 text-xs font-mono text-center"
                />
              </div>
            </div>
          </div>

          </> : <p className="text-xs text-zinc-400">Macro targets are included with FITz Pro. You can save a custom workout on Free.</p>}

          {/* Coach Notes */}
          <div>
            <label className="block text-3xs font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Coach Notes & Directives
            </label>
            <textarea
              rows={2}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="Provide execution cues, rest day guidance, or recovery advice..."
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#1754d8] leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-zinc-300 text-xs font-medium transition-colors border border-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-2 px-5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-md shadow-[#1754d8]/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Assigning Split...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save & Assign Routine
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
