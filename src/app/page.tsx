import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f5f1]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="text-lg font-semibold tracking-tight">
          Forge Coach
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button render={<Link href="/sign-up" />}>Create account</Button>
        </div>
      </nav>
      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="mb-5 text-sm font-semibold tracking-[0.2em] text-emerald-800 uppercase">
            Coaching without the guesswork
          </p>
          <h1 className="max-w-3xl text-5xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-7xl">
            Every set. Every meal. One honest signal.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-600">
            Build precise weekly plans, let clients log what actually happened,
            and coach from compliance you can trust.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/sign-in" />}>
              Open your workspace <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/sign-up" />}
            >
              Join an invitation
            </Button>
          </div>
        </div>
        <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,.25)] sm:p-8">
          <p className="text-sm font-medium text-zinc-500">This week</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <span className="text-5xl font-semibold tracking-tight">
                91.5%
              </span>
              <p className="mt-1 text-sm text-zinc-500">weighted compliance</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
              6 day streak
            </span>
          </div>
          <div className="mt-8 grid gap-3">
            {[
              [
                CalendarDays,
                "Dated assignments",
                "Coach-local and client-local time",
              ],
              [
                CheckCircle2,
                "Set-level truth",
                "Assigned sets drive the denominator",
              ],
              [
                ShieldCheck,
                "Tenant scoped",
                "Ownership verified on every operation",
              ],
            ].map(([Icon, title, detail]) => (
              <div
                key={String(title)}
                className="flex gap-4 rounded-xl bg-zinc-50 p-4"
              >
                <Icon className="mt-0.5 size-5 text-zinc-700" />
                <div>
                  <p className="font-medium">{String(title)}</p>
                  <p className="text-sm text-zinc-500">{String(detail)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
