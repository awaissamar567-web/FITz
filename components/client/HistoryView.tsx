"use client";

import React, { useState, useEffect } from "react";
import { History, Calendar, Scale, Utensils, MessageSquare } from "lucide-react";
import { Client, Checkin } from "@/types/database";

interface HistoryViewProps {
  client: Client;
  experienceId: string;
}

export function HistoryView({ client, experienceId }: HistoryViewProps) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const params = new URLSearchParams({ companyId: client.company_id, experienceId });
        const res = await fetch(`/api/client/plan?${params}`);
        const data = await res.json();
        if (data.checkins) {
          setCheckins(data.checkins);
        }
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [client, experienceId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-normal">
        Loading Check-In History...
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Check-In Timeline</h2>
        <span className="text-3xs text-slate-400 font-mono font-normal bg-[#161616] px-2 py-0.5 rounded-md border border-white/[0.06]">
          {checkins.length} Submissions Logged
        </span>
      </div>

      {checkins.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0c0c0c]/85 backdrop-blur-md border border-white/[0.08] text-center space-y-2">
          <History className="w-8 h-8 mx-auto text-slate-600" />
          <h3 className="text-sm font-medium text-slate-300">No Check-Ins Yet</h3>
          <p className="text-xs font-normal text-slate-500 max-w-sm mx-auto">
            Submit your first weekly check-in to start tracking your bodyweight and physique transformation timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkins.map((chk) => (
            <div
              key={chk.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0c]/85 backdrop-blur-md border border-white/[0.08] shadow-lg shadow-black/30 space-y-3 transition-colors hover:border-[#1754d8]/50"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-white">{chk.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  {chk.weight && (
                    <span className="text-xs font-mono font-medium text-[#1754d8] bg-[#1754d8]/10 px-2 py-0.5 rounded-md border border-[#1754d8]/20">
                      {chk.weight} kg
                    </span>
                  )}
                  {chk.macro_hit && Object.keys(chk.macro_hit).length > 0 && (
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

              {chk.coach_feedback && <div className="rounded-xl bg-blue-950/20 p-3 space-y-1"><p className="text-3xs font-semibold text-blue-300">Coach feedback</p><p className="text-xs text-white whitespace-pre-wrap">{chk.coach_feedback}</p></div>}
              {chk.notes && (
                <div className="p-3 rounded-xl bg-[#111111]/90 border border-white/[0.06]">
                  <p className="text-xs text-slate-300 leading-relaxed italic font-normal">
                    "{chk.notes}"
                  </p>
                </div>
              )}

              {chk.photo_url && (
                <div className="pt-1">
                  <img
                    src={chk.photo_url}
                    alt="Progress Check-in"
                    className="w-full h-56 object-cover rounded-xl border border-white/[0.12] shadow-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
