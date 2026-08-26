"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, Zap, X, ArrowRight, Loader2, ExternalLink, ArrowLeft } from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  activeCount: number;
}

export function PaywallModal({ isOpen, onClose, activeCount }: PaywallModalProps) {
  const [showInAppCheckout, setShowInAppCheckout] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  if (!isOpen) return null;

  const proPlanCheckoutUrl =
    process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL ||
    "https://whop.com/alpha-desk-a604/api-app-tf-h2-bk5s-mu-v3-uo-fi-tz-pro-plan/";

  const handleStartInAppCheckout = () => {
    // Attempt native parent postMessage for Whop iframe environment
    try {
      if (typeof window !== "undefined" && window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "whop_in_app_purchase",
            url: proPlanCheckoutUrl,
          },
          "*"
        );
      }
    } catch {
      // Ignore cross-origin error and proceed with embedded modal
    }

    setShowInAppCheckout(true);
    setIsIframeLoading(true);
  };

  const handleClose = () => {
    setShowInAppCheckout(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div
        className={`relative w-full ${
          showInAppCheckout ? "max-w-2xl h-[85vh] max-h-[720px]" : "max-w-lg"
        } overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c0c0e]/95 backdrop-blur-2xl text-zinc-100 shadow-2xl transition-all flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Glow Gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#1754d8]/25 via-[#1754d8]/5 to-transparent pointer-events-none" />

        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] relative z-10">
          {showInAppCheckout ? (
            <button
              onClick={() => setShowInAppCheckout(false)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.06]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Features
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-3xs font-medium uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/60 font-sans">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Free Tier Cap ({activeCount}/5 Clients)
            </div>
          )}

          <div className="flex items-center gap-2">
            {showInAppCheckout && (
              <a
                href={proPlanCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white transition-colors border border-white/[0.08] text-xs flex items-center gap-1 px-2"
                title="Open in new window"
              >
                <span className="hidden sm:inline text-3xs">Open External</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition-colors border border-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {showInAppCheckout ? (
          <div className="relative flex-1 w-full bg-[#09090b] flex flex-col overflow-hidden">
            {isIframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#09090b]/90 backdrop-blur-sm z-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#1754d8]" />
                <span className="text-xs text-zinc-400">Loading Secure Whop Checkout...</span>
              </div>
            )}
            <iframe
              src={proPlanCheckoutUrl}
              title="Whop Pro Plan Checkout"
              className="w-full h-full border-none flex-1 rounded-b-xl"
              allow="payment *"
              onLoad={() => setIsIframeLoading(false)}
            />
          </div>
        ) : (
          <div className="p-6 sm:p-7 space-y-5 relative">
            {/* Title */}
            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="text-xl font-display font-semibold text-white tracking-tight">
                Unlock Unlimited Clients with FITz Pro
              </h2>
              <p className="text-xs font-normal text-zinc-400 leading-relaxed">
                You’ve reached the 5-client limit on the free tier. Scale your coaching business with unlimited roster capacity and real-time retention tools.
              </p>
            </div>

            {/* Pro Features Checklist */}
            <div className="space-y-2.5 rounded-xl bg-white/[0.02] p-4 border border-white/[0.06]">
              <div className="text-3xs font-medium uppercase tracking-wider text-zinc-400">
                Everything in FITz Pro:
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
                  <span className="text-2xl font-display font-semibold text-white tracking-tight">$25</span>
                  <span className="text-xs font-normal text-zinc-400"> / month</span>
                </div>
                <span className="text-3xs text-emerald-400 font-medium flex items-center gap-1 font-sans">
                  <Zap className="w-3 h-3 fill-current" /> Instant In-App Activation
                </span>
              </div>

              <button
                onClick={handleStartInAppCheckout}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#1754d8]/30 group"
              >
                <span>Upgrade to Pro ($25/mo)</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

