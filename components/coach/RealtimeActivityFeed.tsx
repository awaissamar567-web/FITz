"use client";

import React, { useState, useEffect } from "react";
import { Activity, Camera, Radio, Scale, Utensils } from "lucide-react";

interface ActivityFeedItem {
  id: string;
  client_id: string;
  client_whop_user_id: string;
  date: string;
  weight: number | null;
  photo_url: string | null;
  macro_hit: { hitTarget?: boolean; calories?: number; protein?: number };
  notes: string | null;
  created_at: string;
}

interface RealtimeActivityFeedProps {
  companyId: string;
  initialFeed?: ActivityFeedItem[];
  onSelectClient?: (clientId: string) => void;
}

export function RealtimeActivityFeed({
  companyId,
  initialFeed = [],
  onSelectClient,
}: RealtimeActivityFeedProps) {
  const [feed, setFeed] = useState<ActivityFeedItem[]>(initialFeed);

  // Realtime polling fallback for instant feed updates
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch(`/api/coach/feed?companyId=${companyId}&limit=15`);
        const data = await res.json();
        if (data.feed) {
          setFeed(data.feed);
        }
      } catch (err) {
        console.error("Feed poll error:", err);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 4000); // 4-second live poll
    return () => clearInterval(interval);
  }, [companyId]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/85 backdrop-blur-md shadow-xl shadow-black/40 space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-[#1754d8]" />
          <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">Activity Feed</h3>
        </div>
      </div>

      {/* Feed List */}
      {feed.length === 0 ? (
        <div className="text-center py-8 text-slate-500 space-y-1.5">
          <Activity className="w-6 h-6 mx-auto text-slate-600" />
          <p className="text-xs font-medium text-slate-300">No check-ins logged yet</p>
          <p className="text-3xs font-normal text-slate-500 max-w-[200px] mx-auto">Client check-ins will appear live here as they submit.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {feed.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectClient && onSelectClient(item.client_id)}
              className="p-3 rounded-xl border border-white/[0.06] bg-[#111111]/90 hover:border-[#1754d8]/60 hover:bg-[#151515] cursor-pointer transition-all space-y-1.5 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-white truncate max-w-[140px]">
                  {(item as any).client_display_name || item.client_whop_user_id}
                </span>
                <span className="text-3xs font-normal text-slate-500 font-mono">
                  {item.date || new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono font-normal">
                  {item.weight !== null && (
                    <span className="text-slate-300 text-xs">
                      {item.weight} kg
                    </span>
                  )}
                  {item.macro_hit && (
                    <span
                      className={`text-3xs px-1.5 py-0.2 rounded font-medium ${
                        item.macro_hit.hitTarget
                          ? "bg-emerald-950/80 text-emerald-300"
                          : "bg-amber-950/80 text-amber-300"
                      }`}
                    >
                      {item.macro_hit.hitTarget ? "Macros Hit" : "Macros Off"}
                    </span>
                  )}
                </div>

                {item.photo_url && (
                  <span className="inline-flex items-center gap-1 text-3xs text-slate-400 font-normal">
                    <Camera className="w-3 h-3 text-[#1754d8]" /> Photo
                  </span>
                )}
              </div>

              {item.notes && (
                <p className="text-2xs text-slate-400 line-clamp-1 italic font-normal">
                  "{item.notes}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
