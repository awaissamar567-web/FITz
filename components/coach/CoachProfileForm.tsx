"use client";

import { useEffect, useId, useState } from "react";
import { ArrowRight, Check, Loader2, UserRound } from "lucide-react";
import type { Company } from "@/types/database";
import { COACH_PHOTO_MAX_BYTES, COACH_PHOTO_TYPES, validateCoachProfile } from "@/lib/coach-profile";

interface CoachProfileFormProps {
  company: Company;
  onboarding?: boolean;
  onSaved: (company: Company) => void;
}

const inputClass = "min-h-11 w-full rounded-xl border border-white/[0.08] bg-darkInput px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fitzBtn disabled:opacity-60";

export function CoachProfileForm({ company, onboarding = false, onSaved }: CoachProfileFormProps) {
  const id = useId();
  const [name, setName] = useState(company.coach_name || "");
  const [years, setYears] = useState(company.coach_years_experience?.toString() ?? "");
  const [expertise, setExpertise] = useState(company.coach_expertise || "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    setSaved(false);
    if (!COACH_PHOTO_TYPES.includes(file.type)) { setError("Use a JPG, PNG, or WebP profile photo."); return; }
    if (file.size > COACH_PHOTO_MAX_BYTES) { setError("Choose a profile photo smaller than 2 MB."); return; }
    setPhoto(file); setRemovePhoto(false); setError(null);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const parsedYears = years.trim() === "" ? NaN : Number(years);
    const validation = validateCoachProfile(name, parsedYears, expertise);
    if (validation) { setError(validation); return; }
    setSaving(true); setError(null); setSaved(false);
    try {
      const form = new FormData();
      form.set("coach_name", name.trim());
      form.set("coach_years_experience", String(parsedYears));
      form.set("coach_expertise", expertise.trim());
      if (photo) form.set("photo", photo);
      if (removePhoto) form.set("remove_photo", "true");
      const response = await fetch(`/api/coach/profile?companyId=${encodeURIComponent(company.whop_company_id)}`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.company) throw new Error(result.error || "Could not save your profile. Please try again.");
      onSaved(result.company);
      setName(result.company.coach_name); setExpertise(result.company.coach_expertise);
      setPhoto(null); setRemovePhoto(false); setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    } finally { setSaving(false); }
  };

  const avatar = removePhoto ? null : preview || company.avatar_url;
  return (
    <form onSubmit={save} aria-label="Coach profile" className="space-y-6">
      <fieldset disabled={saving} className="space-y-6">
        <legend className="sr-only">Your coaching profile</legend>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/[0.04]">
            {avatar ? <img src={avatar} alt="Coach profile preview" className="h-full w-full object-cover" /> : <UserRound aria-hidden="true" className="h-8 w-8 text-zinc-500" strokeWidth={1.5} />}
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor={`${id}-photo`} className="block text-xs font-medium text-white">Profile picture <span className="font-normal text-zinc-500">(optional)</span></label>
            <input id={`${id}-photo`} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby={`${id}-photo-help`} onChange={e => choosePhoto(e.target.files?.[0])} className="block w-full min-w-0 text-3xs text-zinc-400 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-white/[0.06] file:px-3 file:font-medium file:text-zinc-200 hover:file:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fitzBtn" />
            <p id={`${id}-photo-help`} className="text-3xs text-zinc-500">JPG, PNG, or WebP · up to 2 MB. Stored privately.</p>
            {(avatar || company.coach_avatar_path) && !removePhoto && <button type="button" onClick={() => { setPhoto(null); setRemovePhoto(true); setSaved(false); }} className="min-h-11 text-3xs text-zinc-400 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fitzBtn">Remove photo</button>}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div className="space-y-2">
            <label htmlFor={`${id}-name`} className="block text-xs font-medium text-zinc-300">Coach name</label>
            <input id={`${id}-name`} name="coach_name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e => { setName(e.target.value); setSaved(false); }} placeholder="Your name" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-years`} className="block text-xs font-medium text-zinc-300">Years of experience</label>
            <input id={`${id}-years`} name="coach_years_experience" type="number" inputMode="numeric" required min={0} max={80} step={1} value={years} onChange={e => { setYears(e.target.value); setSaved(false); }} placeholder="e.g. 5" className={inputClass} />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor={`${id}-expertise`} className="block text-xs font-medium text-zinc-300">Main expertise</label>
          <input id={`${id}-expertise`} name="coach_expertise" required minLength={2} maxLength={120} value={expertise} onChange={e => { setExpertise(e.target.value); setSaved(false); }} placeholder="e.g. Strength training & body recomposition" className={inputClass} />
          <p className="text-3xs text-zinc-500">The area of coaching you specialize in. You can update this later.</p>
        </div>
      </fieldset>

      {error && <p role="alert" className="rounded-xl bg-red-950/40 p-3 text-xs text-red-300">{error}</p>}
      {saved && !onboarding && <p role="status" className="flex items-center gap-2 text-xs text-emerald-400"><Check aria-hidden="true" className="h-4 w-4" />Coach profile saved.</p>}
      <button type="submit" disabled={saving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-fitzBtn px-5 py-3 text-xs font-semibold text-white hover:bg-fitzBtn-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-darkBg disabled:cursor-wait disabled:opacity-60 motion-safe:active:scale-[0.96] sm:w-auto">
        {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : onboarding ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : <Check aria-hidden="true" className="h-4 w-4" />}
        {saving ? "Saving profile…" : onboarding ? "Open my coach dashboard" : "Save coach profile"}
      </button>
    </form>
  );
}

export function CoachOnboarding({ company, onSaved }: Omit<CoachProfileFormProps, "onboarding">) {
  return (
    <main className="grid min-h-screen place-items-center bg-darkBg px-4 py-8 font-sans text-zinc-100 sm:px-6">
      <section className="w-full max-w-2xl space-y-7 rounded-2xl bg-darkCard p-5 sm:p-8">
        <header className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <img src="/brand/fitz_logo.png" alt="FITz" className="h-8 w-10 object-contain" />
            <span className="text-3xs font-medium uppercase tracking-wider text-zinc-500">Coach setup</span>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Make this workspace yours.</h1>
            <p className="max-w-lg text-xs leading-relaxed text-zinc-400">Tell us who’s coaching. Set up your profile, then choose your clients and start building their programs.</p>
          </div>
        </header>
        <CoachProfileForm company={company} onboarding onSaved={onSaved} />
        <p className="text-3xs text-zinc-500">One profile per coaching business. You can edit it anytime in Coach Settings.</p>
      </section>
    </main>
  );
}
