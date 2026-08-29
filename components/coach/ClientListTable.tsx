"use client";

import React from "react";
import {
  Users,
  Search,
  Dumbbell,
  AlertTriangle,
  ChevronRight,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Client, ClientStatus } from "@/types/database";

export interface EnrichedClient extends Client {
  latestCheckinDate?: string;
  daysSinceLastCheckin?: number | null;
  lastCheckinWeight?: number;
  lastCheckinDate?: string;
  lastCheckin?: any;
  hasActivePlan?: boolean;
}

interface ClientListTableProps {
  clients: EnrichedClient[];
  selectedStatus: ClientStatus | "all";
  onStatusChange: (status: ClientStatus | "all") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectClient: (clientId: string) => void;
  onAssignPlan: (client: EnrichedClient) => void;
}

export function ClientListTable({
  clients,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  onSelectClient,
  onAssignPlan,
}: ClientListTableProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4 font-sans">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Client Roster</h2>
            <span className="text-3xs font-mono font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md">
              {clients.length} Members
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, handle, goal..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs font-normal placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#1754d8] focus:border-[#1754d8] transition-colors"
          />
        </div>
      </div>

      {/* Filter Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-3xs font-medium">
        {(["all", "active", "at_risk", "cancelled"] as const).map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`py-1.5 px-3 rounded-lg capitalize transition-all shrink-0 active:scale-[0.98] ${
              selectedStatus === status
                ? "bg-[#1754d8] text-white shadow-sm font-medium"
                : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] font-normal"
            }`}
          >
            {status === "all" ? "All Clients" : status.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Client Table Grid */}
      {clients.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 space-y-2">
          <Users className="w-8 h-8 mx-auto text-zinc-600" />
          <p className="text-xs font-medium text-zinc-300">No matching clients found</p>
          <p className="text-3xs font-normal max-w-xs mx-auto text-zinc-500">
            Try adjusting your search query or status filter to find members.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-3xs uppercase tracking-wider text-zinc-500 font-medium">
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">Goal & Split</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Last Check-In</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {clients.map((c) => {
                const displayName = (c as any).display_name || c.whop_user_id;
                const isAtRisk = c.status === "at_risk" || (c.daysSinceLastCheckin && c.daysSinceLastCheckin > 7);

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => onSelectClient(c.id)}
                  >
                    {/* Member Column */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1754d8]/15 border border-[#1754d8]/30 flex items-center justify-center text-[#1754d8] font-display font-semibold text-xs shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white text-xs truncate max-w-[140px] group-hover:text-[#1754d8] transition-colors">
                            {displayName}
                          </p>
                          <p className="text-3xs font-mono text-zinc-500 truncate max-w-[140px] font-normal">
                            @{c.whop_user_id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Goal & Split */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-normal text-zinc-200 truncate max-w-[150px]">
                          {c.goal || "General Fitness"}
                        </p>
                        <p className="text-3xs text-zinc-500 font-normal">
                          {c.equipment?.daysPerWeek ? `${c.equipment.daysPerWeek}d/week` : "Custom Split"}
                        </p>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-3xs font-medium px-2 py-0.5 rounded-md capitalize inline-flex items-center gap-1 ${
                          !c.intake_completed
                            ? "bg-sky-950/80 text-sky-300"
                            : isAtRisk
                            ? "bg-amber-950/80 text-amber-300"
                            : c.status === "active"
                            ? "bg-emerald-950/80 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {!c.intake_completed ? "Intake Pending" : isAtRisk ? "⚠️ At Risk" : c.status}
                      </span>
                    </td>

                    {/* Last Check-In */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5 font-normal">
                        {!c.intake_completed ? (
                          <span className="text-3xs text-zinc-500 font-mono">Awaiting intake</span>
                        ) : c.daysSinceLastCheckin == null ? (
                          <span className="text-3xs text-zinc-500 font-mono">No check-in yet</span>
                        ) : (
                          <>
                            <p className="text-xs text-zinc-300 font-mono">
                              {c.lastCheckinDate || c.latestCheckinDate || "Recent"}
                            </p>
                            <p className={`text-3xs font-mono ${c.daysSinceLastCheckin > 7 ? "text-amber-400 font-medium" : "text-zinc-500"}`}>
                              {c.daysSinceLastCheckin === 0
                                ? "Today"
                                : c.daysSinceLastCheckin > 7
                                ? `Overdue (${c.daysSinceLastCheckin}d ago)`
                                : `${c.daysSinceLastCheckin}d ago`}
                            </p>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Actions Toolbar */}
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onAssignPlan(c)}
                          className="py-1 px-2.5 rounded-lg bg-white/[0.04] hover:bg-[#1754d8] hover:text-white active:scale-[0.98] text-zinc-300 font-medium text-3xs transition-all flex items-center gap-1"
                        >
                          <Dumbbell className="w-3 h-3" />
                          <span>Assign Split</span>
                        </button>
                        <button
                          onClick={() => onSelectClient(c.id)}
                          className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] active:scale-[0.98] text-zinc-400 hover:text-white transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
