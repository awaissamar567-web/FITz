"use client";

import { useEffect, useState } from "react";
import type { Client, Company } from "@/types/database";
import { coachingSlots } from "@/lib/entitlements";

/** A roster tool, not a blocking paywall: every member and their history stays visible. */
export function CoachingSlots({ company, clients, onSaved }: {
  company: Company; clients: Client[]; onSaved: (company: Company) => void;
}) {
  const slots = coachingSlots(company, clients);
  const initialIds = slots.selectedIds.join(",");
  const [selected, setSelected] = useState(slots.selectedIds);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => { setSelected(initialIds ? initialIds.split(",") : []); }, [initialIds]);
  const eligible = clients.filter(c => c.status === "active" || c.status === "at_risk");
  const shown = eligible.filter(c => `${c.display_name || ""} ${c.whop_user_id}`.toLowerCase().includes(query.toLowerCase()));
  const changed = [...selected].sort().join(",") !== [...slots.selectedIds].sort().join(",");

  async function save() {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/coach/slots", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.whop_company_id, clientIds: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save coaching slots.");
      onSaved(result.company);
      setMessage("Coaching slots saved. Member history is unchanged.");
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Could not save coaching slots."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="coaching-slots-title" className="rounded-2xl bg-darkCard p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 id="coaching-slots-title" className="font-display text-lg font-semibold text-white">Your coaching slots</h2>
        <p className="text-xs text-zinc-400">Choose who you coach on {company.plan === "pro" ? "Pro" : "Free"}. All {eligible.length} active members stay in your roster.</p>
      </div>
      <span className="text-sm font-display font-semibold text-white tabular-nums">{selected.length} / {slots.limit} selected</span>
    </div>
    <p className="text-2xs text-zinc-400">Unselected members keep their history, but new workouts, intake and check-ins are paused. This does not cancel their Whop membership.</p>
    {slots.automatic && <p className="text-2xs text-zinc-400">Your earliest members are selected automatically until you save your own choices.</p>}
    {eligible.length > 0 ? <>
      <input aria-label="Find a member for coaching slots" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a member…"
        className="w-full rounded-xl bg-darkBg px-3 py-2 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500" />
      <fieldset disabled={busy} className="max-h-64 overflow-y-auto space-y-1">
        <legend className="sr-only">Members enabled for coaching</legend>
        {shown.length === 0 && <p className="py-4 text-xs text-zinc-400">No members match your search.</p>}
        {shown.map(client => {
          const checked = selected.includes(client.id);
          return <label key={client.id} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-xs text-white hover:bg-white/[0.04] cursor-pointer">
            <input type="checkbox" checked={checked} disabled={!checked && selected.length >= slots.limit}
              onChange={() => { setMessage(""); setSelected(ids => checked ? ids.filter(id => id !== client.id) : [...ids, client.id]); }}
              className="h-4 w-4 accent-blue-600 disabled:opacity-40" />
            <span className="min-w-0 flex-1 break-words">{client.display_name || client.whop_user_id}</span>
            <span className={`text-3xs ${checked ? "text-emerald-300" : "text-zinc-500"}`}>{checked ? "Coaching enabled" : "History only"}</span>
          </label>;
        })}
      </fieldset>
      {selected.length >= slots.limit && <p className="text-2xs text-zinc-400">All slots selected. Uncheck a member before choosing another.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !changed && !slots.automatic} onClick={save}
          className="min-h-11 rounded-xl bg-fitzBtn px-4 py-2 text-xs font-semibold text-white hover:bg-fitzBtn-hover disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
          {busy ? "Saving…" : "Save coaching slots"}
        </button>
        {message && <p role={failed ? "alert" : "status"} className={`text-2xs ${failed ? "text-red-300" : "text-emerald-300"}`}>{message}</p>}
      </div>
    </> : <p className="text-xs text-zinc-400">Members appear here after joining a product with FITz access and opening their portal.</p>}
  </section>;
}
