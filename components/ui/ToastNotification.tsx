"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title?: string;
  message: string;
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function ToastNotification({
  toast,
  onDismiss,
  autoDismissMs = 4000,
}: ToastNotificationProps) {
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [toast, autoDismissMs, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-3 duration-200">
      <div
        className={`p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-start gap-3 ${
          isSuccess
            ? "bg-[#0c0c0e]/95 border-emerald-500/30 text-emerald-300 shadow-emerald-950/30"
            : isError
            ? "bg-[#0c0c0e]/95 border-red-500/30 text-red-300 shadow-red-950/30"
            : "bg-[#0c0c0e]/95 border-[#1754d8]/40 text-blue-300 shadow-[#1754d8]/20"
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {isError && <AlertCircle className="w-5 h-5 text-red-400" />}
          {!isSuccess && !isError && <Info className="w-5 h-5 text-[#1754d8]" />}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          {toast.title && (
            <h4 className="text-xs font-display font-semibold text-white tracking-tight">
              {toast.title}
            </h4>
          )}
          <p className="text-xs font-normal text-zinc-300 leading-relaxed">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
