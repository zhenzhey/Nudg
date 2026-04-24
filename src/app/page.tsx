import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Bell,
  Trophy,
  Users,
  Target,
  Send,
  Zap,
} from "lucide-react";
import { DemoLoginButton } from "@/components/demo-login-button";

const FILTERS = [
  {
    key: "Externally verifiable",
    desc: "A URL, repo, deployed app, or file — something reviewable.",
    pass: "Deploy a React portfolio site",
    fail: "Learn React",
  },
  {
    key: "1–12 week arc",
    desc: "Each week yields a distinct artifact. No micro or marathon goals.",
    pass: "Launch an AI tool in 6 weeks",
    fail: "Become an expert programmer",
  },
  {
    key: "Professionally valuable",
    desc: "Builds toward outcomes that matter to employers or customers.",
    pass: "Build a CLI tool and publish to npm",
    fail: "Write a private journal",
  },
  {
    key: "User-controlled",
    desc: "The outcome depends entirely on your own work.",
    pass: "Publish an app to the App Store",
    fail: "Get hired at Google",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="page-container flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-black">
              N
            </span>
            Nudg
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <DemoLoginButton
                  label="Demo"
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors disabled:opacity-60"
                />
                <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background: dark + line grid + noise */}
        <div className="absolute inset-0 line-grid pointer-events-none" />
        <div className="absolute inset-0 noise pointer-events-none opacity-60" />
        {/* Subtle teal bloom, top-left */}
        <div className="absolute top-[-60px] left-[-80px] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />

        <div className="page-container relative pt-14 pb-0">
          {/* ─ Wordmark row ─ */}
          <div className="relative">
            <h1
              className="font-black leading-none tracking-tighter text-primary select-none"
              style={{ fontSize: "clamp(72px, 14vw, 200px)" }}
            >
              NUDG
            </h1>
            {/* Teal rule — matches the slide underline */}
            <div className="h-[3px] bg-primary w-full" />
          </div>

          {/* ─ Tagline + content row ─ */}
          <div className="grid lg:grid-cols-2 gap-0 items-end">
            {/* Left: tagline + description + CTA */}
            <div className="pt-6 pb-16">
              <p
                className="font-bold text-text-primary leading-tight mb-6"
                style={{ fontSize: "clamp(22px, 3.5vw, 44px)" }}
              >
                Making builders ship.
              </p>

              <p className="text-sm text-text-muted max-w-sm leading-relaxed mb-8">
                You don&apos;t have a motivation problem. You need structure —
                and someone who actually notices when you go quiet.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-10">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm glow-primary"
                >
                  Start building — free
                  <ArrowRight size={15} />
                </Link>
                <DemoLoginButton />
                <Link href="#how" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  How it works ↓
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    { bg: "#6366F1", label: "ZL" },
                    { bg: "#A78BFA", label: "AK" },
                    { bg: "#10B981", label: "MR" },
                    { bg: "#F59E0B", label: "JS" },
                  ].map(({ bg, label }, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-bg flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: bg }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-muted">
                  <span className="text-text-secondary font-medium">47 builders</span> shipped something this week
                </p>
              </div>
            </div>

            {/* Right: product mock — flush to bottom of hero */}
            <div className="relative hidden lg:flex justify-end items-end pb-0">
              <div className="w-[340px]">
                <div className="gradient-border rounded-t-xl rounded-b-none">
                  <div className="bg-surface rounded-t-xl rounded-b-none p-5">
                    {/* Goal header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-0.5">Active goal</p>
                        <p className="text-sm font-semibold text-text-primary">Build an AI SaaS — 6 weeks</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 rounded-full px-2.5 py-1">
                        <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                        <span className="text-xs text-success font-medium">Week 3</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-text-muted mb-1.5">
                        <span>Progress</span><span>50%</span>
                      </div>
                      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full w-1/2 bg-gradient-to-r from-primary to-accent rounded-full" />
                      </div>
                    </div>

                    {/* Weeks */}
                    <div className="space-y-2 mb-4">
                      {[
                        { label: "Auth + DB schema", status: "verified" },
                        { label: "Core AI feature", status: "submitted" },
                        { label: "Payments + deploy", status: "pending" },
                      ].map(({ label, status }, i) => (
                        <div key={i} className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                            status === "verified" ? "bg-success text-white"
                            : status === "submitted" ? "bg-primary text-white"
                            : "bg-surface-3 border border-border text-text-muted"
                          }`}>
                            {status === "pending" ? i + 1 : "✓"}
                          </div>
                          <p className="text-xs text-text-primary flex-1">{label}</p>
                          <span className={`text-xs ${
                            status === "verified" ? "text-success"
                            : status === "submitted" ? "text-primary"
                            : "text-text-muted"
                          }`}>{status}</span>
                        </div>
                      ))}
                    </div>

                    {/* Check-in */}
                    <div className="border-t border-border pt-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 bg-primary-muted rounded-full flex items-center justify-center text-xs shrink-0">🤝</div>
                        <p className="text-xs text-text-muted leading-relaxed">
                          Week 2 shipped early — nice. How&apos;s payments going?
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification — top right of card */}
              <div className="absolute top-2 -right-6 bg-surface border border-primary/30 rounded-xl p-3 flex items-center gap-2 shadow-xl">
                <div className="text-base">🎉</div>
                <div>
                  <p className="text-xs font-semibold text-primary">Week 2 verified!</p>
                  <p className="text-[10px] text-text-muted">Core AI feature live</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────────────── */}
      <section className="py-16 border-t border-border">
        <div className="page-container">
          <div className="max-w-xl mx-auto text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">This is an execution problem.</h2>
            <p className="text-sm text-text-muted">
              Not motivation. Not ideas. The system is broken — and no one is fixing it for you.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: "🌫️", title: "Vague goals don't ship", desc: '"Learn AI" isn\'t a goal. It\'s a wish. You need something you can actually cross off.' },
              { icon: "🧱", title: "No structure, no start", desc: "When everything feels overwhelming, nothing gets started. The blank page wins." },
              { icon: "👻", title: "No one notices", desc: "Solo projects die in silence. Without a check-in, disappearing is frictionless." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-surface border border-border rounded-xl p-5 hover:border-border-2 transition-colors">
                <div className="text-2xl mb-3">{icon}</div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" className="py-20 border-t border-border bg-surface">
        <div className="page-container">
          <div className="max-w-xl mx-auto text-center mb-12">
            <p className="text-xs font-mono text-primary-light uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl font-bold mb-3">Structure + accountability</h2>
            <p className="text-sm text-text-muted">AI builds the plan. You execute. Someone pays attention.</p>
          </div>

          {/* Bento grid */}
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Target, step: "01", title: "Set your goal", desc: "Specific, verifiable, yours. AI validates it through 4 filters." },
              { icon: Zap, step: "02", title: "Get the plan", desc: "Week-by-week deliverables. 3–5 tasks each. Clear enough to start." },
              { icon: Send, step: "03", title: "Submit real output", desc: "A link, demo, or file. Not vibes — artifacts that prove you shipped." },
              { icon: Bell, step: "04", title: "Someone shows up", desc: "Celebration when you ship. A check-in when you go quiet." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="gradient-border">
                <div className="bg-surface-2 rounded-xl p-5 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-primary-muted rounded-lg flex items-center justify-center">
                      <Icon size={15} className="text-primary-light" />
                    </div>
                    <span className="text-xs font-mono text-text-muted">{step}</span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary mb-1.5">{title}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Accountability ────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="page-container">
          <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-mono text-primary-light uppercase tracking-widest mb-4">The human layer</p>
              <h2 className="text-3xl font-bold mb-4 text-balance">
                Not punishment.{" "}
                <span className="gradient-text">Presence.</span>
              </h2>
              <p className="text-text-muted text-sm mb-6">
                Our survey confirmed it: people don&apos;t want financial threats. They want someone
                they trust to know how they&apos;re doing — celebration when they ship, a nudge when they go quiet.
              </p>
              <ul className="space-y-3">
                {[
                  { icon: Trophy, text: "Celebrated publicly when you ship" },
                  { icon: Bell, text: "Checked in when you go quiet" },
                  { icon: Users, text: "Community of builders at your level" },
                  { icon: Target, text: "Optional stake to raise the bar — not punish" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-text-secondary">
                    <div className="w-7 h-7 bg-surface border border-border rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-primary-light" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Notification stack */}
            <div className="space-y-3">
              <div className="gradient-border">
                <div className="bg-surface-2 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-success/15 rounded-full flex items-center justify-center text-base shrink-0">🎉</div>
                  <div>
                    <p className="text-xs font-semibold text-success mb-0.5">You shipped Week 3!</p>
                    <p className="text-xs text-text-muted">Payments + deploy is live. Portfolio looking strong — your next interview just got easier.</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-muted rounded-full flex items-center justify-center text-base shrink-0">🤝</div>
                <div>
                  <p className="text-xs font-semibold text-text-primary mb-0.5">Week 4 is due Sunday</p>
                  <p className="text-xs text-text-muted">Haven&apos;t seen you around. Everything good? Your goal isn&apos;t going anywhere — we&apos;re here.</p>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-accent/15 rounded-full flex items-center justify-center text-base shrink-0">👥</div>
                <div>
                  <p className="text-xs font-semibold text-text-primary mb-0.5">3 builders shipped this week</p>
                  <p className="text-xs text-text-muted">AK launched their portfolio. MR published to npm. You&apos;re up — Sunday deadline.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Filters ────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-surface">
        <div className="page-container">
          <div className="max-w-xl mx-auto text-center mb-10">
            <p className="text-xs font-mono text-primary-light uppercase tracking-widest mb-3">Goal validation</p>
            <h2 className="text-3xl font-bold mb-3">Not every goal makes the cut</h2>
            <p className="text-sm text-text-muted">
              4 filters to make sure what you&apos;re working on will actually produce something real.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {FILTERS.map(({ key, desc, pass, fail }) => (
              <div key={key} className="bg-surface-2 border border-border rounded-xl p-5 hover:border-border-2 transition-colors">
                <h3 className="text-sm font-semibold text-text-primary mb-1">{key}</h3>
                <p className="text-xs text-text-muted mb-3">{desc}</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={12} className="text-success mt-0.5 shrink-0" />
                    <span className="text-success/90">&ldquo;{pass}&rdquo;</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <XCircle size={12} className="text-danger mt-0.5 shrink-0" />
                    <span className="text-danger/80 line-through">&ldquo;{fail}&rdquo;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="relative py-28 border-t border-border overflow-hidden">
        <div className="absolute inset-0 line-grid pointer-events-none" />
        <div className="absolute inset-0 noise pointer-events-none opacity-40" />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-primary/7 rounded-full blur-[120px] pointer-events-none" />

        <div className="page-container relative">
          <div className="max-w-2xl">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-5">Ready?</p>
            <h2 className="font-black leading-none tracking-tight text-text-primary mb-6" style={{ fontSize: "clamp(40px, 7vw, 88px)" }}>
              Build the thing.<br />
              <span className="text-primary">Get the proof.</span>
            </h2>
            <p className="text-text-muted mb-10 text-sm max-w-sm">
              Set your goal. Get the plan. Ship every week. Someone&apos;s watching — and rooting for you.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-7 py-3.5 rounded-lg transition-colors text-sm glow-primary"
              >
                Start building — it&apos;s free
                <ArrowRight size={15} />
              </Link>
              <p className="text-xs text-text-muted">No credit card · 2 minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
            <span className="w-5 h-5 bg-primary rounded flex items-center justify-center text-white text-xs font-black">N</span>
            Nudg
          </div>
          <p>© {new Date().getFullYear()} Nudg — Someone in your corner.</p>
        </div>
      </footer>
    </div>
  );
}
