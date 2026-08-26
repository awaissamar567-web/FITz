import Link from "next/link";
import { ArrowRight, CheckCircle2, Dumbbell, ShieldCheck, Users } from "lucide-react";

const capabilities = [
  "Whop-authenticated coach and member access",
  "Tenant-isolated plans, check-ins, and progress photos",
  "Workout programming, macro targets, and retention workflows",
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-4 py-10 text-zinc-100 sm:px-6 lg:px-8">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c0c0e]/90 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="border-b border-white/[0.07] px-6 py-8 sm:px-10 sm:py-10">
          <img src="/brand/fitz_logo.png" alt="FITz" className="h-11 w-auto object-contain" />
          <div className="mt-8 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1 text-3xs font-medium uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Production workspace
            </div>
            <h1 className="text-balance font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Fitness coaching operations, built for Whop.
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-6 text-zinc-400">
              FITz opens inside an authorized Whop company or membership experience. Your dashboard and member portal are loaded from your real workspace—not sample accounts.
            </p>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-8 sm:grid-cols-[1.15fr_0.85fr] sm:px-10">
          <div className="space-y-4">
            <p className="text-3xs font-medium uppercase tracking-[0.16em] text-zinc-500">Included in your workspace</p>
            <ul className="space-y-3">
              {capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-3 text-sm leading-5 text-zinc-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4f7df3]" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1754d8]/25 bg-[#1754d8]/10 text-[#6f98ff]">
                <Users className="h-4 w-4" />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 text-zinc-400">
                <Dumbbell className="h-4 w-4" />
              </span>
            </div>
            <h2 className="mt-5 font-display text-lg font-semibold text-white">Open FITz from Whop</h2>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Launch the app from your Whop dashboard or purchased experience so Whop can securely identify your workspace and access level.
            </p>
            <div className="mt-5 grid gap-2">
              <a
                href="https://whop.com/dashboard"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1754d8] px-4 text-xs font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#154ac0] active:scale-[0.98]"
              >
                Open Whop dashboard <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <Link
                href="/discover"
                className="flex min-h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                View FITz plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
