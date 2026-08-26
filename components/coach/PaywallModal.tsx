"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, Zap, X, ArrowRight, Loader2 } from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  activeCount: number;
}

export function PaywallModal({ isOpen, onClose, activeCount }: PaywallModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!isOpen) return null;

  const proPlanCheckoutUrl =
    process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL ||
    `https://whop.com/checkout/${process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID || "plan_fitz_pro"}`;

  const handleUpgrade = () => {
    setIsUpgrading(true);
    // Redirect to Whop In-App Purchase checkout
    window.open(proPlanCheckoutUrl, "_blank");
    setTimeout(() => setIsUpgrading(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c0c0e]/95 backdrop-blur-2xl text-zinc-100 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Glow Gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#1754d8]/25 via-[#1754d8]/5 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition-colors z-10 border border-white/[0.08]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-5 relative">
          {/* Badge & Title */}
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-3xs font-medium uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/60 font-sans">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Free Tier Cap Reached ({activeCount}/5 Clients)
            </div>
            <h2 className="text-xl font-display font-semibold text-white tracking-tight">
              Unlock Unlimited Clients with Fitz Pro
            </h2>
            <p className="text-xs font-normal text-zinc-400 leading-relaxed">
              You’ve reached the 5-client limit on the free tier. Scale your coaching business with unlimited roster capacity and real-time retention tools.
            </p>
          </div>

          {/* Pro Features Checklist */}
          <div className="space-y-2.5 rounded-xl bg-white/[0.02] p-4 border border-white/[0.06]">
            <div className="text-3xs font-medium uppercase tracking-wider text-zinc-400">
              Everything in Fitz Pro:
            </div>
            <ul className="space-y-2 text-xs text-zinc-200 font-normal">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong className="font-medium text-white">Unlimited Active Clients</strong> (No 5-client roster cap)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong className="font-medium text-white">Real-Time Activity Feed</strong> with live check-in sync</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong className="font-medium text-white">Automated Churn Detection</strong> & at-risk client alerts</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong className="font-medium text-white">Custom Workout Split Builder</strong> & Macro Targets</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong className="font-medium text-white">Direct Whop Native Chat Integration</strong></span>
              </li>
            </ul>
          </div>

          {/* Pricing & CTA */}
          <div className="space-y-3 pt-1">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-display font-semibold text-white tracking-tight">$29</span>
                <span className="text-xs font-normal text-zinc-400"> / month</span>
              </div>
              <span className="text-3xs text-emerald-400 font-medium flex items-center gap-1 font-sans">
                <Zap className="w-3 h-3 fill-current" /> Billed via Whop Payments
              </span>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#1754d8]/30 group disabled:opacity-60"
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting to Whop...
                </>
              ) : (
                <>
                  <span>Upgrade to Pro ($29/mo)</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
