"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Flame,
  Activity,
  CheckCircle2,
  RefreshCw,
  Scale,
  Calendar,
} from "lucide-react";

export default function HomePage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setSeedSuccess(false);
    try {
      const res = await fetch("/api/test/seed-demo", { method: "POST" });
      if (res.ok) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to seed demo data", e);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111111] text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#1754d8]/30 selection:text-white">
      <div className="w-full max-w-5xl space-y-6 py-6">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <img src="/brand/fitz_logo.png" alt="FITz" className="h-12 w-auto object-contain mx-auto" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-semibold tracking-tight text-white">
            Coach & Member Workspace
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto font-normal leading-relaxed">
            A production-ready fitness coaching platform. Select any sandbox persona below to test.
          </p>

          {/* Quick Seed Button */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="py-2 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-md shadow-[#1754d8]/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
              {isSeeding ? "Seeding Sandbox..." : "Reset & Prime Demo Data"}
            </button>
            {seedSuccess && (
              <span className="text-xs font-normal text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Database Seeded!
              </span>
            )}
          </div>
        </div>

        {/* Personas Sandbox Grid (Frosted Glass Elevation) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Coach Workspace */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4 hover:border-white/[0.14] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-[#1754d8]/15 text-[#1754d8] border border-[#1754d8]/30">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-[#1754d8]/20 text-[#1754d8] border border-[#1754d8]/30">
                  Coach Portal
                </span>
              </div>

              <div>
                <h2 className="text-base font-display font-semibold text-white tracking-tight">
                  Coach Alex Rivera Dashboard
                </h2>
                <p className="text-xs text-zinc-400 font-normal mt-1 leading-relaxed">
                  Full multi-tenant coach workspace. Manage active clients, view live check-in feed, assign workout splits, and prevent subscription churn.
                </p>
              </div>

              <div className="space-y-1.5 text-3xs font-mono text-zinc-400 pt-1">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5 Enriched Demo Clients</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-Time Activity Feed & Photos</span>
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/biz_coach_alex?demo=true"
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-[#1754d8] hover:text-white active:scale-[0.98] text-white font-medium text-xs border border-white/[0.08] transition-all flex items-center justify-center gap-2 group"
            >
              <span>Launch Coach Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Member Experience Portals */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4 hover:border-white/[0.14] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <span className="text-3xs font-medium px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  Member Experiences
                </span>
              </div>

              <div>
                <h2 className="text-base font-display font-semibold text-white tracking-tight">
                  Client Member Experience Portals
                </h2>
                <p className="text-xs text-zinc-400 font-normal mt-1 leading-relaxed">
                  Interactive client portal embedded inside Whop. Clients log weekly check-ins with photo uploads, review assigned splits, and track bodyweight.
                </p>
              </div>

              {/* Persona Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <Link
                  href="/experiences/exp_marcus?demo=true"
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.06] text-center space-y-0.5 transition-all"
                >
                  <span className="text-xs font-medium text-white block">Marcus Chen</span>
                  <span className="text-3xs text-emerald-400 font-mono">Active (4d/wk)</span>
                </Link>

                <Link
                  href="/experiences/exp_sarah?demo=true"
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.06] text-center space-y-0.5 transition-all"
                >
                  <span className="text-xs font-medium text-white block">Sarah Jenkins</span>
                  <span className="text-3xs text-amber-400 font-mono">At-Risk (12d ago)</span>
                </Link>

                <Link
                  href="/experiences/exp_emma?demo=true"
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.06] text-center space-y-0.5 transition-all"
                >
                  <span className="text-xs font-medium text-white block">Emma Watson</span>
                  <span className="text-3xs text-zinc-400 font-mono">Pending Intake</span>
                </Link>
              </div>
            </div>

            <Link
              href="/experiences/exp_marcus?demo=true"
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-[#1754d8] hover:text-white active:scale-[0.98] text-white font-medium text-xs border border-white/[0.08] transition-all flex items-center justify-center gap-2 group"
            >
              <span>Open Marcus Portal (Active Member)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
