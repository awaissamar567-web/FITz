"use client";
import { useState } from "react";

export function CoachFeedback({ companyId, clientId, checkinId, initialFeedback, enabled }: {
  companyId: string; clientId: string; checkinId: string; initialFeedback?: string; enabled: boolean;
}) {
  const [feedback, setFeedback] = useState(initialFeedback || "");
  const [saved, setSaved] = useState(initialFeedback || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function save() {
    setBusy(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/coach/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, clientId, checkinId, feedback }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feedback could not be saved.");
      setSaved(data.checkin.coach_feedback || ""); setSuccess(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Feedback could not be saved."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl bg-white/[0.03] p-3 space-y-2">
    <label htmlFor={`feedback-${checkinId}`} className="block text-xs font-semibold text-white">Coach feedback <span className="text-3xs text-blue-300">PRO</span></label>
    {enabled ? <>
      <textarea id={`feedback-${checkinId}`} value={feedback} maxLength={2000} rows={2} disabled={busy} onChange={e => { setFeedback(e.target.value); setSuccess(false); }} placeholder="Add guidance for this check-in…" className="w-full rounded-lg bg-darkBg p-3 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500" />
      <button type="button" disabled={busy || feedback.trim() === saved.trim()} onClick={save} className="min-h-11 rounded-xl bg-fitzBtn px-4 text-xs font-semibold text-white hover:bg-fitzBtn-hover disabled:opacity-40">{busy ? "Saving…" : "Save feedback"}</button>
    </> : <><p className="text-xs text-zinc-400">Sending feedback requires Pro and an enabled coaching slot.</p>{saved && <p className="text-xs text-white whitespace-pre-wrap">{saved}</p>}</>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    {success && <p role="status" className="text-xs text-emerald-300">Saved. The member can read this in their check-in history.</p>}
  </section>;
}
