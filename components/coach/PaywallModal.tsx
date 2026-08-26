"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles
} from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  activeCount?: number;
  onSuccess?: () => void;
}

export function PaywallModal({
  isOpen,
  onClose,
  companyId = "biz_default_coach",
  activeCount = 5,
  onSuccess,
}: PaywallModalProps) {
  // Step 1: "upgrade_card" (default) | Step 2: "checkout" (Inline Embed)
  const [step, setStep] = useState<"upgrade_card" | "checkout">("upgrade_card");
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const directCheckoutUrl =
    process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL ||
    "https://whop.com/checkout/plan_mliEb2HaYIFBZ";

  // Reset step whenever modal is reopened
  useEffect(() => {
    if (isOpen) {
      setStep("upgrade_card");
      setIsIframeLoading(true);
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Listen for Whop postMessage checkout completion
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (
        event.data?.type === "whop:payment:success" ||
        event.data?.action === "membership.activated" ||
        event.data?.event === "checkout.completed"
      ) {
        setIsSuccess(true);
        if (onSuccess) onSuccess();

        // Trigger local webhook upgrade
        try {
          await fetch("/api/webhooks/whop", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-test-webhook": "true",
            },
            body: JSON.stringify({
              id: `evt_whop_checkout_${Date.now()}`,
              action: "membership.activated",
              data: {
                company_id: companyId,
                user_id: "user_coach_whop",
                is_app_subscription: true,
                plan_id: "plan_mliEb2HaYIFBZ",
                package_id: "fitz_pro",
              },
            }),
          });
        } catch (e) {
          console.error("Error triggering upgrade webhook:", e);
        }

        setTimeout(() => {
          setIsSuccess(false);
          onClose();
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }, 1500);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [companyId, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div
        className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c0c0e] text-zinc-100 shadow-2xl transition-all flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#111114] shrink-0">
          <div className="flex items-center gap-2">
            {step === "checkout" ? (
              <button
                type="button"
                onClick={() => setStep("upgrade_card")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Plan Details</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#1a68ff] flex items-center justify-center text-white text-3xs font-black shadow-sm">
                  F
                </div>
                <span className="text-xs font-semibold text-white tracking-tight">FITz Pro Upgrade</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          /* Success Screen */
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 py-16 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">Welcome to FITz Pro!</h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                Your subscription has been activated. Unlimited client roster and real-time retention analytics are now unlocked.
              </p>
            </div>
          </div>
        ) : step === "upgrade_card" ? (
          /* =========================================================================
             STEP 1: THE UPGRADE CARD (Primary Initial Pop-up)
             ========================================================================= */
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 animate-in fade-in duration-150">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight pt-0.5">
                Supercharge Your Coaching Business with FITz Pro
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deliver high-touch accountability to more members in half the time. Built for Whop coaches who want higher retention and effortless scaling.
              </p>
            </div>

            {/* ROI Value Callout */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-emerald-200 block text-3xs uppercase tracking-wider">High-ROI Coaching Investment</span>
                <p className="text-3xs text-emerald-300/90 leading-relaxed">
                  Retaining just <strong>one coaching client</strong> for an extra month pays for FITz Pro 4x over.
                </p>
              </div>
            </div>

            {/* Pricing Card Hero Box */}
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-3xs font-medium uppercase tracking-wider text-zinc-400">Subscription Plan</div>
                <div className="text-sm font-semibold text-white">FITz Coach Pro</div>
                <div className="text-3xs text-zinc-500">Billed monthly through Whop • Cancel anytime</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white tracking-tight">$25</div>
                <div className="text-3xs text-zinc-400">/ month</div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-2.5 rounded-xl bg-white/[0.02] p-4 border border-white/[0.06]">
              <div className="text-3xs font-medium uppercase tracking-wider text-zinc-400">
                Everything Included in Pro:
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-200 font-normal">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Save 6+ Hours/Week</strong> with reusable 7-day program templates (PPL, Upper/Lower)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Automated Churn Queue</strong> with 1-click Whop DM intervention before members cancel</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Full Accountability Loop</strong> with progress photos, coach feedback notes & macro limits</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Unlimited Active Clients</strong> — scale from 5 to 500+ members with zero caps</span>
                </li>
              </ul>
            </div>

            {/* Action CTA Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setStep("checkout")}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1a68ff] hover:bg-[#1556d6] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-[#1a68ff]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Upgrade to FITz Pro — $25/mo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-center">
                <span className="text-3xs text-zinc-500">
                  Instant activation via secure Whop Inline Checkout
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STEP 2: OFFICIAL INLINE WHOP CHECKOUT (plan_mliEb2HaYIFBZ)
             ========================================================================= */
          <div className="relative w-full h-[620px] bg-[#0c0c0e] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <iframe
              src={directCheckoutUrl}
              title="Whop Checkout"
              className="w-full h-full border-none flex-1 bg-[#0c0c0e]"
              allow="payment *; clipboard-write *"
            />
          </div>
        )}
      </div>
    </div>
  );
}



