"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Sparkles,
  CheckCircle2,
  X,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  Check
} from "lucide-react";

// Dynamically import WhopCheckoutEmbed with SSR disabled for optimal Next.js client-side rendering
const WhopCheckoutEmbed = dynamic(
  () => import("@whop/checkout/react").then((mod) => mod.WhopCheckoutEmbed),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-12 min-h-[420px] gap-3 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1a68ff]" />
        <span className="text-xs text-zinc-400">Loading Secure Whop Inline Checkout...</span>
      </div>
    ),
  }
);

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
                <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                  $25 / month
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === "checkout" && (
              <a
                href={directCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white transition-colors border border-white/[0.08] text-xs flex items-center gap-1 px-2"
                title="Open checkout in new window"
              >
                <span className="hidden sm:inline text-3xs">New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
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
            {/* Header / Cap Alert */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-3xs font-medium uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/60 font-sans">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Free Tier Cap ({activeCount}/5 Clients)
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight pt-0.5">
                Unlock Unlimited Clients with FITz Pro
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You’ve reached the 5-client capacity on the Free Tier. Upgrade to Pro to scale your coaching business without roster limits.
              </p>
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
                  <span><strong className="font-medium text-white">Unlimited Active Clients</strong> (No 5-client cap)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Live Activity Feed</strong> with real-time check-in sync</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Automated Churn Detection</strong> & at-risk alerts</span>
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
             STEP 2: OFFICIAL WHOP INLINE EMBED CHECKOUT (plan_mliEb2HaYIFBZ)
             ========================================================================= */
          <div className="relative flex-1 w-full min-h-[500px] bg-[#0a0a0c] flex flex-col overflow-y-auto p-2 sm:p-4 animate-in fade-in duration-200">
            <WhopCheckoutEmbed
              planId="plan_mliEb2HaYIFBZ"
              theme="dark"
              themeOptions={{
                accentColor: "blue",
                borderRadius: 12,
                buttonText: "Upgrade to FITz Pro — $25/mo",
              }}
              skipRedirect={true}
              onComplete={async (planId, receiptId) => {
                console.log("[Whop Checkout] Payment completed successfully:", planId, receiptId);
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
                      id: `evt_whop_inline_${Date.now()}`,
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
              }}
            />
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="px-5 py-2.5 border-t border-white/[0.06] bg-[#0c0c0e] flex items-center justify-between text-3xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Encrypted 256-bit Whop Checkout</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span>Instant In-App Activation</span>
          </div>
        </div>
      </div>
    </div>
  );
}



