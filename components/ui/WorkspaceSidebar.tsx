"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, type LucideIcon } from "lucide-react";

interface SidebarItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  badge?: ReactNode;
  iconClassName?: string;
  disabled?: boolean;
  separated?: boolean;
}

interface WorkspaceSidebarProps {
  view: "coach" | "member";
  name: string;
  detail: string;
  avatarUrl?: string | null;
  items: SidebarItem[];
  footer: (collapsed: boolean) => ReactNode;
}

/** Shared desktop navigation. Mobile keeps its existing bottom navigation. */
export function WorkspaceSidebar({ view, name, detail, avatarUrl, items, footer }: WorkspaceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const storageKey = `fitz:${view}:sidebar-collapsed`;
  const menuId = `${view}-sidebar-menu`;
  const toggleLabel = `${collapsed ? "Expand" : "Collapse"} ${view} sidebar`;

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === "true");
    } catch {
      // Embedded browsers can block storage; the toggle still works in memory.
    }
  }, [storageKey]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(storageKey, String(next));
    } catch {
      // Persistence is optional, never a requirement for navigation.
    }
  };

  return (
    <aside
      aria-label={`${view === "coach" ? "Coach" : "Member"} sidebar`}
      data-collapsed={collapsed}
      className={`hidden md:flex sticky top-0 h-dvh shrink-0 flex-col gap-4 border-r border-[var(--border-glass)] bg-darkCard/80 py-5 backdrop-blur-2xl z-30 ${collapsed ? "w-20 px-3" : "w-64 px-5"}`}
    >
      <div className="shrink-0 space-y-3">
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
          <img src="/brand/fitz_logo.png" alt={view === "coach" ? "Coach Dashboard" : "Fitz Member Portal"} className="h-8 w-10 object-contain" />
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            aria-controls={menuId}
            title={toggleLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fitzBtn motion-safe:active:scale-[0.96]"
          >
            <ChevronLeft aria-hidden="true" className={`h-4 w-4 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        {!collapsed && (
          <div className="space-y-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
            {avatarUrl && <img src={avatarUrl} alt={`${name} profile`} className="mb-2 h-10 w-10 rounded-xl object-cover" />}
            <p className="truncate text-xs font-medium text-white" title={name}>{name}</p>
            <p className="truncate text-3xs font-mono text-zinc-500" title={detail}>{detail}</p>
          </div>
        )}
      </div>

      <nav id={menuId} aria-label={`${view === "coach" ? "Coach" : "Member"} navigation`} className="min-h-0 flex-1 overflow-y-auto space-y-1.5">
        <p className={collapsed ? "sr-only" : "mb-2 px-2 text-3xs font-medium uppercase tracking-wider text-zinc-500"}>
          {view === "coach" ? "Workspace" : "Member Menu"}
        </p>
        {items.map(({ label, icon: Icon, active, badge, onClick, iconClassName, disabled, separated }) => (
          <div key={label} className={separated ? "mt-2 border-t border-white/[0.06] pt-2" : undefined}>
            <button
              type="button"
              onClick={onClick}
              disabled={disabled}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={`flex min-h-11 w-full items-center rounded-xl text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fitzBtn disabled:cursor-wait disabled:opacity-60 motion-safe:active:scale-[0.96] ${collapsed ? "justify-center px-2" : "gap-2.5 px-3"} ${active ? "bg-white/[0.08] font-medium text-white" : "font-normal text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"}`}
            >
              <Icon aria-hidden="true" strokeWidth={active ? 2 : 1.5} className={`h-4 w-4 shrink-0 ${iconClassName || (active ? "text-fitzBtn" : "text-zinc-400")}`} />
              <span className={collapsed ? "sr-only" : "min-w-0 flex-1 text-left"}>{label}</span>
              {badge != null && <span className={collapsed ? "sr-only" : "text-3xs tabular-nums text-zinc-400"}>{badge}</span>}
            </button>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-white/[0.06] pt-4">
        {footer(collapsed)}
      </div>
    </aside>
  );
}
