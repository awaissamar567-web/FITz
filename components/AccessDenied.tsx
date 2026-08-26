import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  reason?: "unauthorized" | "forbidden" | "not_found";
}

export function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to view this page.",
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#111111] text-slate-100 font-sans">
      <div className="max-w-md w-full p-6 sm:p-7 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] shadow-xl text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-950/80 border border-red-900/60 flex items-center justify-center text-red-400">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-display font-semibold tracking-tight mb-2 text-white">
          {title}
        </h1>

        <p className="text-xs font-normal text-slate-400 mb-5 leading-relaxed">
          {message}
        </p>

        <div className="p-3 mb-5 rounded-xl bg-[#111111] border border-white/[0.08] text-2xs font-mono font-normal text-slate-400">
          Security Boundary: Tenant Isolation Enforced
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] text-white text-xs font-medium transition-colors shadow-md shadow-[#1754d8]/20"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
