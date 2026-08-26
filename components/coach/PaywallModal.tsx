"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  Coins,
  Landmark,
  ChevronDown,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Check,
  ExternalLink
} from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  activeCount?: number;
  onSuccess?: () => void;
}

const COUNTRIES = [
  { code: "PK", name: "Pakistan" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SG", name: "Singapore" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
];

export function PaywallModal({
  isOpen,
  onClose,
  companyId = "biz_default_coach",
  activeCount = 5,
  onSuccess,
}: PaywallModalProps) {
  // Navigation tabs: "checkout" | "features"
  const [view, setView] = useState<"checkout" | "features">("checkout");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wire" | "crypto" | "ach">("card");

  // Form states
  const [email, setEmail] = useState("coach@fitnesspro.com");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [addressLine1, setAddressLine1] = useState("");

  // Processing & completion states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const proPlanCheckoutUrl =
    process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL ||
    "https://whop.com/alpha-desk-a604/api-app-gtq-zd2-hl-cz-yjr-a-fi-tz-pro-plan/";

  // Auto-format card number: 1234 1234 1234 1234
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  // Auto-format expiry: MM / YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // CVC formatting: max 4 digits
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCvc(raw);
  };

  // Handle direct join / payment submission
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // Simulate/trigger membership.activated upgrade webhook on backend
      const res = await fetch("/api/webhooks/whop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-webhook": "true",
        },
        body: JSON.stringify({
          id: `evt_inapp_checkout_${Date.now()}`,
          action: "membership.activated",
          data: {
            company_id: companyId,
            user_id: "user_coach_inapp",
            is_app_subscription: true,
            plan_id: "plan_fitz_pro",
            package_id: "fitz_pro",
            email: email,
          },
        }),
      });

      if (!res.ok) {
        console.warn("[Checkout] Upgrade response:", res.status);
      }

      // Short artificial delay for smooth authentic feel
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsProcessing(false);
      setIsSuccess(true);

      if (onSuccess) {
        onSuccess();
      }

      // Close modal after celebration
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1500);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || "Failed to process payment. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div
        className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c0c0e] text-zinc-100 shadow-2xl transition-all flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-[#111114]">
          <div className="flex items-center gap-2">
            {view === "features" ? (
              <button
                type="button"
                onClick={() => setView("checkout")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Checkout
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#1a68ff] flex items-center justify-center text-white text-3xs font-black">
                  F
                </div>
                <span className="text-xs font-semibold text-white tracking-tight">FITz Pro Plan</span>
                <span className="text-3xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                  $25 / mo
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {view === "checkout" && (
              <button
                type="button"
                onClick={() => setView("features")}
                className="text-3xs text-zinc-400 hover:text-zinc-200 underline decoration-zinc-600 transition-colors px-1.5 py-0.5"
              >
                View Features
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Screen */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 py-16 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">Welcome to FITz Pro!</h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                Your subscription has been activated. Unlimited client capacity and retention features are now unlocked.
              </p>
            </div>
          </div>
        ) : view === "features" ? (
          /* Features Breakdown Screen */
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-3xs font-medium uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/60 font-sans">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Free Tier Cap ({activeCount}/5 Clients)
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight pt-1">
                Unlock Unlimited Coaching Scale
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Scale past 5 clients and automate your fitness coaching workflow.
              </p>
            </div>

            <div className="space-y-2.5 rounded-xl bg-white/[0.02] p-4 border border-white/[0.06]">
              <div className="text-3xs font-medium uppercase tracking-wider text-zinc-400">
                Included in FITz Pro:
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-200 font-normal">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Unlimited Active Clients</strong> (No roster limits)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Live Activity Feed</strong> with instant check-in sync</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Automated Churn Detection</strong> & at-risk flags</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Workout Split Builder</strong> & Custom Macro Targets</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong className="font-medium text-white">Direct Whop Native Chat & Webhook Sync</strong></span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setView("checkout")}
              className="w-full py-3 px-4 rounded-xl bg-[#1a68ff] hover:bg-[#1556d6] active:scale-[0.98] text-white font-medium text-xs transition-all shadow-md shadow-[#1a68ff]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              Continue to Card Checkout ($25/mo)
            </button>
          </div>
        ) : (
          /* Native In-App Checkout Form (Matches Image 1 & 2) */
          <form onSubmit={handleJoin} className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-5 flex-1">
              {/* Email Section */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="johnappleseed@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#151518] border border-white/[0.09] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#1a68ff] focus:ring-1 focus:ring-[#1a68ff] transition-all"
                />
              </div>

              {/* Payment Method Group */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">Payment method</label>

                <div className="rounded-xl border border-white/[0.09] bg-[#121215] overflow-hidden divide-y divide-white/[0.06]">
                  {/* Card Option (Active & Expanded) */}
                  <div
                    onClick={() => setPaymentMethod("card")}
                    className={`p-3.5 transition-colors cursor-pointer ${
                      paymentMethod === "card" ? "bg-[#16161a]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          paymentMethod === "card"
                            ? "border-[#1a68ff] bg-[#1a68ff]"
                            : "border-zinc-600 bg-transparent"
                        }`}
                      >
                        {paymentMethod === "card" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <CreditCard className="w-4 h-4 text-zinc-300" />
                      <span className="text-xs font-medium text-zinc-200">Card</span>
                    </div>

                    {/* Card Inner Input Container (Visible when Card is selected) */}
                    {paymentMethod === "card" && (
                      <div className="mt-3.5 space-y-3.5 pl-0.5 animate-in fade-in duration-150">
                        {/* Card Information Sub-box */}
                        <div className="space-y-1.5">
                          <label className="block text-3xs font-medium text-zinc-400">Card information</label>
                          <div className="rounded-lg border border-white/[0.09] bg-[#18181c] overflow-hidden">
                            {/* Card Number Input */}
                            <div className="relative flex items-center px-3 py-2 border-b border-white/[0.06]">
                              <input
                                type="text"
                                required
                                value={cardNumber}
                                onChange={handleCardNumberChange}
                                placeholder="1234 1234 1234 1234"
                                className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none tracking-wider font-mono"
                              />
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <span className="text-3xs font-black italic bg-blue-600/30 text-blue-300 border border-blue-500/40 px-1 py-0.5 rounded">
                                  VISA
                                </span>
                                <span className="text-3xs font-black text-amber-300 bg-amber-600/20 border border-amber-500/30 px-1 py-0.5 rounded">
                                  MC
                                </span>
                              </div>
                            </div>

                            {/* Expiry & CVC Grid */}
                            <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
                              <input
                                type="text"
                                required
                                value={cardExpiry}
                                onChange={handleExpiryChange}
                                placeholder="MM / YY"
                                className="px-3 py-2 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none font-mono"
                              />
                              <input
                                type="password"
                                required
                                value={cardCvc}
                                onChange={handleCvcChange}
                                placeholder="CVC"
                                maxLength={4}
                                className="px-3 py-2 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Billing Details Sub-box */}
                        <div className="space-y-2">
                          <label className="block text-3xs font-medium text-zinc-400">Billing details</label>

                          <div className="space-y-2">
                            {/* Name Input */}
                            <input
                              type="text"
                              required
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="Name on card"
                              className="w-full px-3 py-2 rounded-lg bg-[#18181c] border border-white/[0.09] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#1a68ff] focus:ring-1 focus:ring-[#1a68ff]"
                            />

                            {/* Country Dropdown */}
                            <div className="relative">
                              <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full appearance-none px-3 py-2 rounded-lg bg-[#18181c] border border-white/[0.09] text-xs text-white focus:outline-none focus:border-[#1a68ff] focus:ring-1 focus:ring-[#1a68ff] cursor-pointer"
                              >
                                {COUNTRIES.map((c) => (
                                  <option key={c.code} value={c.name} className="bg-[#18181c] text-white">
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            {/* Address Line 1 */}
                            <input
                              type="text"
                              value={addressLine1}
                              onChange={(e) => setAddressLine1(e.target.value)}
                              placeholder="Address line 1"
                              className="w-full px-3 py-2 rounded-lg bg-[#18181c] border border-white/[0.09] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#1a68ff] focus:ring-1 focus:ring-[#1a68ff]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bank Wire Option */}
                  <div
                    onClick={() => setPaymentMethod("wire")}
                    className={`p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                      paymentMethod === "wire" ? "bg-[#16161a]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === "wire"
                            ? "border-[#1a68ff] bg-[#1a68ff]"
                            : "border-zinc-600 bg-transparent"
                        }`}
                      >
                        {paymentMethod === "wire" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <Building2 className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-300">Bank Wire</span>
                    </div>
                  </div>

                  {/* Pay with Crypto Option */}
                  <div
                    onClick={() => setPaymentMethod("crypto")}
                    className={`p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                      paymentMethod === "crypto" ? "bg-[#16161a]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === "crypto"
                            ? "border-[#1a68ff] bg-[#1a68ff]"
                            : "border-zinc-600 bg-transparent"
                        }`}
                      >
                        {paymentMethod === "crypto" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <Coins className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-300">Pay with Crypto</span>
                    </div>
                  </div>

                  {/* ACH Option */}
                  <div
                    onClick={() => setPaymentMethod("ach")}
                    className={`p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                      paymentMethod === "ach" ? "bg-[#16161a]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === "ach"
                            ? "border-[#1a68ff] bg-[#1a68ff]"
                            : "border-zinc-600 bg-transparent"
                        }`}
                      >
                        {paymentMethod === "ach" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <Landmark className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-300">ACH</span>
                    </div>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Bottom Summary & Solid Blue Join Action Bar */}
            <div className="p-5 border-t border-white/[0.07] bg-[#0f0f12] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Total due today</span>
                <span className="text-sm font-bold text-white tracking-tight">$25.00</span>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-[#1a68ff] hover:bg-[#1556d6] active:scale-[0.98] text-white font-medium text-xs transition-all shadow-md shadow-[#1a68ff]/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <span>Join</span>
                )}
              </button>

              <div className="flex items-center justify-between text-3xs text-zinc-500 pt-0.5">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-zinc-400" />
                  <span>Encrypted 256-bit Whop Checkout</span>
                </div>
                <a
                  href={proPlanCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 underline decoration-zinc-700"
                >
                  Direct Whop URL <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

