"use client";

import React from "react";
import { Sparkles, ArrowRight, AlertTriangle } from "lucide-react";

interface PaywallBannerProps {
  activeCount: number;
  limit: number;
  onOpenUpgrade: () => void;
}

export function PaywallBanner({ activeCount, limit, onOpenUpgrade }: PaywallBannerProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 backdrop-blur-xl border border-amber-800/60 shadow-xl shadow-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans animate-in fade-in">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5 sm:mt-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-display font-semibold text-white tracking-tight">
              Free Tier Cap Reached ({activeCount}/{limit} Clients)
            </h3>
            <span className="text-3xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300">
              Upgrade Required
            </span>
          </div>
          <p className="text-2xs font-normal text-zinc-400 leading-relaxed">
            You have enrolled {limit} active clients on your free plan. Upgrade to <strong className="text-amber-300 font-medium">Fitz Pro</strong> for unlimited member capacity and automatic churn retention.
          </p>
        </div>
      </div>

      <button
        onClick={onOpenUpgrade}
        className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-medium text-xs shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-600/30"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Upgrade to Pro</span>
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
