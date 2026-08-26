import React from "react";
import Link from "next/link";
import { Dumbbell, Sparkles, CheckCircle2, Zap, Shield, ArrowRight, Activity, Users, Flame } from "lucide-react";

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-[#1754d8] selection:text-white">
      {/* Glow Header */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#1754d8]/20 via-[#1754d8]/5 to-transparent pointer-events-none" />

      <main className="relative max-w-4xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#1754d8]/15 text-[#3b82f6] border border-[#1754d8]/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            The Modern Operating System for Fitness Creators
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
            Manage Clients, Custom Splits & Retention on Whop
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            FITz turns your Whop into an interactive, daily fitness coaching hub. Deliver custom 7-day routines, track daily macro adherence, and prevent member churn automatically.
          </p>
        </div>

        {/* Value Props Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1754d8]/20 border border-[#1754d8]/40 flex items-center justify-center text-[#3b82f6]">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">7-Day Split Builder</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Create unique workout routines with custom exercise lists, set/rep ranges, and coach form cues.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Daily Check-Ins & Photos</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Members log weigh-ins, transformation photos, and macro targets directly to your live activity feed.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Retention Engine</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Automatically flags at-risk clients before they cancel so you can protect your subscription revenue.
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Free Starter</span>
              <div className="text-2xl font-bold text-white mt-1">$0 <span className="text-xs font-normal text-zinc-400">/ month</span></div>
            </div>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Up to 5 Active Clients
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 7-Day Routine Builder & Macros
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Client Progress Tracking
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#1754d8]/20 to-white/[0.02] border border-[#1754d8]/40 space-y-4 relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-3xs font-semibold bg-[#1754d8] text-white">
              POPULAR
            </div>
            <div>
              <span className="text-xs font-semibold text-[#3b82f6] uppercase tracking-wider">FITz Pro</span>
              <div className="text-2xl font-bold text-white mt-1">$29 <span className="text-xs font-normal text-zinc-400">/ month</span></div>
            </div>
            <ul className="space-y-2 text-xs text-zinc-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Unlimited Active Clients
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Reusable Templates (Save 6+ hrs/wk)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 4-Tier Churn Queue & 1-Click Whop DM
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Full Photo Archive & Coach Feedback Loop
              </li>
            </ul>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-4">
          <p className="text-xs text-zinc-500">
            Powered by Whop Native App Infrastructure • Strict Multi-Tenant Data Isolation
          </p>
        </div>
      </main>
    </div>
  );
}
