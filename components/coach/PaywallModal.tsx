"use client";

import React, { useState, useEffect, useRef } from "react";
import { loadWhop } from "@whop/elements";
import { Checkout, CheckoutElement, WhopElements } from "@whop/elements-react";
import { FREE_TIER_CLIENT_LIMIT } from "@/lib/constants/plans";
import {
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const whopElements = loadWhop();

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
  activeCount = FREE_TIER_CLIENT_LIMIT,
  onSuccess,
}: PaywallModalProps) {
  // Step 1: "upgrade_card" (default) | Step 2: "checkout" (Inline Embed)
  const [step, setStep] = useState<"upgrade_card" | "checkout">("upgrade_card");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [checkout, setCheckout] = useState<{ checkoutConfiguration: string } | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [retry, setRetry] = useState(0);

  // Reset step whenever modal is reopened
  useEffect(() => {
    if (isOpen) {
      setStep("upgrade_card");
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== "checkout") return;
    const controller = new AbortController();
    setCheckout(null);
    setCheckoutError("");
    fetch(`/api/coach/checkout?companyId=${encodeURIComponent(companyId)}`, { method: "POST", signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Checkout could not be opened.");
        if (!controller.signal.aborted) setCheckout(data);
      })
      .catch(error => { if (!controller.signal.aborted) setCheckoutError(error.message); });
    return () => controller.abort();
  }, [isOpen, step, companyId, retry]);

  return (
    <dialog ref={dialogRef} aria-label="Upgrade to FITz Pro" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto w-[calc(100%-24px)] max-w-[520px] max-h-[90dvh] p-0 rounded-2xl bg-transparent text-zinc-100 backdrop:bg-black/85 backdrop:backdrop-blur-sm font-sans">
      {isOpen &&
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c0c0e] text-zinc-100 shadow-2xl flex flex-col max-h-[90dvh]"
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
              aria-label="Close upgrade checkout"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {step === "upgrade_card" ? (
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

            {/* Pricing Card Hero Box */}
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-3xs font-medium uppercase tracking-wider text-zinc-400">Subscription Plan</div>
                <div className="text-sm font-semibold text-white">FITz Coach Pro</div>
                <div className="text-3xs text-zinc-500">Billed monthly through Whop • Cancel anytime</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-white tracking-tight">See price at checkout</div>
                <div className="text-3xs text-zinc-400">Secure Whop checkout</div>
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
                  <span><strong className="font-medium text-white">Reusable Program Library</strong> with reusable 7-day program templates (PPL, Upper/Lower)</span>
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
                  <span><strong className="font-medium text-white">Up to 250 Active Coaching Clients</strong> — choose your roster without losing member history</span>
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
                <span>Continue to secure checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-center">
                <span className="text-3xs text-zinc-500">
                  Secure Whop checkout · activation after payment confirmation
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STEP 2: WHOP ELEMENTS CHECKOUT
             ========================================================================= */
          <div className="relative w-full min-h-64 bg-[#0c0c0e] overflow-y-auto p-4">
            {checkoutError ? <div className="space-y-4 py-8 text-center"><p role="alert" className="text-sm text-zinc-300">{checkoutError}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">Try again</button></div>
              : checkout ? (
                <WhopElements
                  elements={whopElements}
                  appearance={{ theme: { appearance: "dark", accentColor: "blue", grayColor: "slate" } }}
                  onLoadError={() => setCheckoutError("Whop checkout could not be loaded. Please try again.")}
                >
                  <Checkout checkoutConfiguration={checkout.checkoutConfiguration}>
                    <CheckoutElement onError={() => setCheckoutError("Whop checkout could not be loaded. Please try again.")} />
                  </Checkout>
                </WhopElements>
              )
              : <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Opening secure checkout…</div>}
          </div>
        )}
      </div>}
    </dialog>
  );
}
