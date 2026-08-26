"use client";

import React, { useState } from "react";
import { Upload, Scale, Utensils, MessageSquare, Check, Loader2, Camera, AlertCircle } from "lucide-react";

interface CheckinFormProps {
  clientId: string;
  companyId: string;
  onCheckinComplete: () => void;
}

export function CheckinForm({ clientId, companyId, onCheckinComplete }: CheckinFormProps) {
  const [weight, setWeight] = useState<string>("78.5");
  const [hitMacros, setHitMacros] = useState<boolean>(true);
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [sodium, setSodium] = useState<string>("");
  const [sugar, setSugar] = useState<string>("");
  const [fiber, setFiber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file (JPG, PNG, WebP).");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) {
      setError("Please enter your current weight.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let photoUrl: string | null = null;

      // 1. Upload photo if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("companyId", companyId);
        formData.append("clientId", clientId);

        const uploadRes = await fetch("/api/client/photo-upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload photo");
        }
        photoUrl = uploadData.photoUrl;
      }

      // 2. Submit check-in payload
      const checkinPayload = {
        companyId,
        clientId,
        weight: parseFloat(weight),
        photoUrl,
        macroHit: {
          hitTarget: hitMacros,
          calories: calories ? parseInt(calories) : undefined,
          protein: protein ? parseInt(protein) : undefined,
          sodium: sodium ? parseInt(sodium) : undefined,
          sugar: sugar ? parseInt(sugar) : undefined,
          fiber: fiber ? parseInt(fiber) : undefined,
        },
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/client/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkinPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record check-in");
      }

      onCheckinComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/85 backdrop-blur-md shadow-xl shadow-black/40 space-y-4 font-sans">
      <div className="border-b border-white/[0.06] pb-3">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Log Progress Check-In</h2>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center gap-2.5 text-red-300 text-xs font-normal">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Weight Field */}
        <div>
          <label className="block text-3xs font-medium uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-[#1754d8]" />
            Current Body Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            required
            placeholder="e.g. 78.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-white/[0.08] bg-[#111111] text-white focus:outline-none focus:ring-1 focus:ring-[#1754d8] font-mono text-xs font-normal transition-colors"
          />
        </div>

        {/* Macros Adherence Toggle */}
        <div className="space-y-1.5">
          <label className="block text-3xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-[#1754d8]" />
            Macro Targets Adherence
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setHitMacros(true)}
              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                hitMacros
                  ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm"
                  : "bg-[#111111] border-white/[0.08] text-slate-400 font-normal hover:text-white"
              }`}
            >
              <Check className="w-3.5 h-3.5" /> Hit Macro Targets
            </button>
            <button
              type="button"
              onClick={() => setHitMacros(false)}
              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                !hitMacros
                  ? "bg-amber-950/70 border-amber-500 text-amber-300 shadow-sm"
                  : "bg-[#111111] border-white/[0.08] text-slate-400 font-normal hover:text-white"
              }`}
            >
              <span>⚠️ Missed Targets</span>
            </button>
          </div>
        </div>

        {/* Optional Macro & Micro Inputs */}
        <div className="space-y-2">
          <label className="block text-3xs font-medium uppercase tracking-wider text-slate-400">
            Daily Intake Log (Optional)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div>
              <label className="block text-3xs font-normal text-slate-400 mb-1">Calories</label>
              <input
                type="number"
                placeholder="e.g. 2450"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#111111] text-white font-mono text-xs font-normal"
              />
            </div>
            <div>
              <label className="block text-3xs font-normal text-emerald-400 mb-1">Protein (g)</label>
              <input
                type="number"
                placeholder="e.g. 180"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-500/20 bg-[#111111] text-emerald-300 font-mono text-xs font-normal"
              />
            </div>
            <div>
              <label className="block text-3xs font-normal text-purple-400 mb-1">Sodium (mg)</label>
              <input
                type="number"
                placeholder="e.g. 2300"
                value={sodium}
                onChange={(e) => setSodium(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-purple-500/20 bg-[#111111] text-purple-300 font-mono text-xs font-normal"
              />
            </div>
            <div>
              <label className="block text-3xs font-normal text-rose-400 mb-1">Sugar (g)</label>
              <input
                type="number"
                placeholder="e.g. 35"
                value={sugar}
                onChange={(e) => setSugar(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-rose-500/20 bg-[#111111] text-rose-300 font-mono text-xs font-normal"
              />
            </div>
            <div>
              <label className="block text-3xs font-normal text-teal-400 mb-1">Fiber (g)</label>
              <input
                type="number"
                placeholder="e.g. 30"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-teal-500/20 bg-[#111111] text-teal-300 font-mono text-xs font-normal"
              />
            </div>
          </div>
        </div>

        {/* Physique Photo Upload */}
        <div className="space-y-1.5">
          <label className="block text-3xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#1754d8]" />
            Physique Progress Photo (optional)
          </label>
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer flex items-center justify-center gap-2.5 p-3 rounded-xl border border-dashed border-white/[0.15] bg-[#111111]/80 hover:bg-[#161616] transition-colors text-slate-400 text-xs font-normal">
              <Upload className="w-4 h-4 text-slate-400" />
              <span>{selectedFile ? selectedFile.name : "Select progress image..."}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-xl border border-white/[0.12]"
              />
            )}
          </div>
        </div>

        {/* Reflection Notes */}
        <div>
          <label className="block text-3xs font-medium uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#1754d8]" />
            Weekly Reflection / Feedback for Coach
          </label>
          <textarea
            rows={3}
            placeholder="How did training feel this week? Any energy dips, joint pain, sleep issues, or routine questions?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-white/[0.08] bg-[#111111] text-white focus:outline-none focus:ring-1 focus:ring-[#1754d8] font-normal text-xs leading-relaxed"
          />
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-md shadow-[#1754d8]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting Check-In...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> Submit Weekly Check-In
            </>
          )}
        </button>
      </form>
    </div>
  );
}
