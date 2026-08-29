"use client";

import React, { useId } from "react";

export interface LineTrendPoint {
  label: string;
  value: number;
  detail: string;
}

interface LineTrendChartProps {
  title: string;
  description: string;
  points: LineTrendPoint[];
  color: "blue" | "emerald";
  valueSuffix?: string;
  target?: number;
  targetLabel?: string;
  maxValue?: number;
  emptyLabel: string;
}

const palette = {
  blue: {
    line: "#3b82f6",
    glow: "#1754d8",
    text: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-300",
  },
  emerald: {
    line: "#34d399",
    glow: "#059669",
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-300",
  },
} as const;

export function LineTrendChart({
  title,
  description,
  points,
  color,
  valueSuffix = "",
  target,
  targetLabel,
  maxValue,
  emptyLabel,
}: LineTrendChartProps) {
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  const colors = palette[color];
  const chartWidth = 640;
  const chartHeight = 224;
  const inset = { top: 18, right: 18, bottom: 42, left: 42 };
  const plotWidth = chartWidth - inset.left - inset.right;
  const plotHeight = chartHeight - inset.top - inset.bottom;
  const observedMax = Math.max(0, ...points.map((point) => point.value), target || 0);
  const scaleMax = Math.max(1, maxValue || observedMax);
  const hasData = points.some((point) => point.value > 0);
  const latest = points.at(-1)?.value || 0;
  const first = points[0]?.value || 0;
  const change = latest - first;

  const coordinates = points.map((point, index) => ({
    x: inset.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: inset.top + plotHeight - (Math.min(scaleMax, point.value) / scaleMax) * plotHeight,
  }));

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates.at(-1)!.x.toFixed(2)} ${(inset.top + plotHeight).toFixed(2)} L ${coordinates[0].x.toFixed(2)} ${(inset.top + plotHeight).toFixed(2)} Z`
    : "";
  const targetY = target == null
    ? null
    : inset.top + plotHeight - (Math.min(scaleMax, target) / scaleMax) * plotHeight;

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">
            {title}
          </h3>
          <p className="mt-1 text-3xs text-zinc-500 leading-relaxed">{description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-2xl font-display font-semibold font-mono ${colors.text}`}>
            {latest}{valueSuffix}
          </div>
          <span className={`inline-flex mt-1 rounded-md px-2 py-0.5 text-3xs font-mono ${colors.badge}`}>
            {change > 0 ? "+" : ""}{change}{valueSuffix} in range
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="block h-52 w-full overflow-visible"
          role="img"
          aria-label={`${title}. ${points.map((point) => `${point.label}: ${point.value}${valueSuffix}`).join(", ")}.`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.glow} stopOpacity="0.28" />
              <stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio) => {
            const y = inset.top + plotHeight - ratio * plotHeight;
            const tickValue = scaleMax * ratio;
            const tickLabel = Number.isInteger(tickValue) ? tickValue.toString() : tickValue.toFixed(1);
            return (
              <g key={ratio}>
                <line x1={inset.left} x2={chartWidth - inset.right} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 6" />
                <text x={inset.left - 10} y={y + 4} fill="#71717a" fontSize="10" textAnchor="end">
                  {tickLabel}{valueSuffix}
                </text>
              </g>
            );
          })}

          {targetY != null && (
            <g>
              <line x1={inset.left} x2={chartWidth - inset.right} y1={targetY} y2={targetY} stroke="#34d399" strokeOpacity="0.55" strokeDasharray="5 6" />
              <text x={chartWidth - inset.right} y={targetY - 7} fill="#6ee7b7" fontSize="10" textAnchor="end">
                {targetLabel || `${target}${valueSuffix} target`}
              </text>
            </g>
          )}

          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
          {linePath && <path d={linePath} fill="none" stroke={colors.line} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {coordinates.map((coordinate, index) => (
            <g key={`${points[index].label}-${index}`}>
              <circle cx={coordinate.x} cy={coordinate.y} r="8" fill={colors.line} fillOpacity="0.12" />
              <circle cx={coordinate.x} cy={coordinate.y} r="3.5" fill="#09090b" stroke={colors.line} strokeWidth="2.5">
                <title>{points[index].detail}</title>
              </circle>
              <text x={coordinate.x} y={chartHeight - 13} fill="#a1a1aa" fontSize="10" textAnchor="middle">
                {points[index].label}
              </text>
            </g>
          ))}
        </svg>

        {!hasData && (
          <div className="pointer-events-none absolute inset-x-12 top-16 flex justify-center">
            <span className="rounded-lg border border-white/[0.08] bg-[#09090b]/90 px-3 py-2 text-3xs text-zinc-400 shadow-lg">
              {emptyLabel}
            </span>
          </div>
        )}
      </div>

      <ul className="sr-only">
        {points.map((point) => <li key={point.label}>{point.detail}</li>)}
      </ul>
    </section>
  );
}
