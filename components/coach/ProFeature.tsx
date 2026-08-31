"use client";

export function ProFeature({ title, description, onUpgrade }: {
  title: string; description: string; onUpgrade?: () => void;
}) {
  return <section className="rounded-xl bg-darkCard p-4 space-y-2">
    <h3 className="font-display text-sm font-semibold text-white">{title} <span className="ml-1 text-3xs text-blue-300">PRO</span></h3>
    <p className="text-xs text-zinc-400">{description}</p>
    {onUpgrade && <button type="button" onClick={onUpgrade} className="min-h-11 rounded-xl bg-fitzBtn px-4 text-xs font-semibold text-white hover:bg-fitzBtn-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">View Pro features</button>}
  </section>;
}
