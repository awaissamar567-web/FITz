"use client";
interface PaywallBannerProps {
  activeCount: number; limit: number; waitingCount?: number; isPro?: boolean;
  onOpenUpgrade: () => void; onManage?: () => void;
}
export function PaywallBanner({ activeCount, limit, waitingCount = 0, isPro = false, onOpenUpgrade, onManage }: PaywallBannerProps) {
  return <div className="p-4 rounded-2xl bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="space-y-1">
      <h3 className="text-sm font-display font-semibold text-white">{isPro ? "Pro" : "Free"} coaching slots: {activeCount}/{limit}</h3>
      <p className="text-xs text-zinc-400">{waitingCount > 0 ? `${waitingCount} members have history-only access. Choose which members to coach; no data is deleted.` : "Your selected clients can keep training. Your dashboard stays available."}</p>
    </div>
    <div className="flex flex-wrap gap-2 shrink-0">
      <button type="button" onClick={onManage} className="min-h-11 rounded-xl px-4 text-xs text-white bg-white/[0.06] hover:bg-white/[0.1]">Manage coaching slots</button>
      {!isPro && <button type="button" onClick={onOpenUpgrade} className="min-h-11 rounded-xl px-4 bg-fitzBtn text-xs font-semibold text-white hover:bg-fitzBtn-hover">Explore Pro · 250 clients</button>}
    </div>
  </div>;
}
