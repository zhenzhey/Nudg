import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  Send,
  BarChart3,
} from "lucide-react";

const FILTERS = [
  {
    key: "Externally verifiable",
    desc: "Produces a URL, GitHub repo, deployed app, or file that can be reviewed.",
    pass: "Build and deploy a React portfolio site",
    fail: "Learn React",
  },
  {
    key: "1–12 week arc",
    desc: "Each week yields a distinct, submittable artifact. No micro or marathon goals.",
    pass: "Launch an AI tool in 6 weeks",
    fail: "Become an expert programmer",
  },
  {
    key: "Professionally valuable",
    desc: "Builds toward career or business outcomes that matter to employers or customers.",
    pass: "Build an open-source CLI tool and publish to npm",
    fail: "Write a private journal",
  },
  {
    key: "User-controlled",
    desc: "The outcome depends entirely on your own work, not someone else's decision.",
    pass: "Build and publish an app to the App Store",
    fail: "Get hired at Google",
  },
];

const HOW_IT_WORKS = [
  {
    icon: Target,
    step: "01",
    title: "Set your goal",
    desc: "Tell us what you want to build. Be specific — vague goals don't ship.",
  },
  {
    icon: Zap,
    step: "02",
    title: "AI validates & plans",
    desc: "We run your goal through 4 filters, then break it into weekly deliverables and micro-tasks.",
  },
  {
    icon: CheckCircle2,
    step: "03",
    title: "Execute week by week",
    desc: "Each week has 3–5 tasks (~5–10 hours total). Small enough to start. Clear enough to finish.",
  },
  {
    icon: Send,
    step: "04",
    title: "Submit real output",
    desc: "Every week, you submit a link, demo, or file. No activity tracking. Only outcomes.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="page-container flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-black">
              N
            </span>
            <span>Nudg</span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Dashboard
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Start building
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="page-container relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Label */}
            <div className="inline-flex items-center gap-2 bg-primary-muted border border-primary/30 rounded-full px-3 py-1.5 text-xs text-primary-light font-medium mb-8">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Weekly deliverable system for builders
            </div>

            <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-balance mb-6 leading-[1.1]">
              Stop planning.{" "}
              <span className="gradient-text">Start shipping.</span>
            </h1>

            <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10 text-balance">
              Turn your vague idea into a structured execution plan.
              Weekly deliverables. Real output. Built-in accountability.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-primary/20"
              >
                Set your first goal
                <ArrowRight size={16} />
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                See how it works ↓
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="page-container">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why builders don&apos;t ship</h2>
            <p className="text-text-muted">
              Millions of people want to build side projects. Most never do.
              Not because they lack ideas — because of three things:
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: "Goals are too vague",
                desc: '"Learn AI" or "build something cool" isn\'t a goal. It\'s a wish. Without definition, there\'s no starting point.',
                icon: "🌫️",
              },
              {
                title: "No structure",
                desc: "Without a clear breakdown, every task feels overwhelming. The blank page never gets filled.",
                icon: "🧱",
              },
              {
                title: "No accountability",
                desc: "Side projects live and die by consistency. Without external pressure, motivation fades by week two.",
                icon: "👻",
              },
            ].map(({ title, desc, icon }) => (
              <div key={title} className="card text-center">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-20 border-t border-border bg-surface">
        <div className="page-container">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The weekly delivery loop</h2>
            <p className="text-text-muted">
              One repeating cycle. Plan → Execute → Submit. Every week.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative">
                <div className="bg-surface-2 border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-primary-muted rounded-lg flex items-center justify-center">
                      <Icon size={17} className="text-primary-light" />
                    </div>
                    <span className="text-xs font-mono text-text-muted">{step}</span>
                  </div>
                  <h3 className="font-semibold text-text-primary mb-1.5">{title}</h3>
                  <p className="text-sm text-text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* The loop visual */}
          <div className="mt-12 max-w-lg mx-auto">
            <div className="bg-surface-2 border border-border rounded-2xl p-6">
              <p className="text-xs text-text-muted text-center mb-4 font-mono uppercase tracking-wider">
                Weekly execution loop
              </p>
              <div className="flex items-center justify-between gap-2">
                {["Goal set", "AI plans", "You execute", "You submit", "Repeat"].map(
                  (label, idx, arr) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-primary-muted rounded-lg flex items-center justify-center mx-auto mb-1">
                          <span className="text-xs font-bold text-primary-light">
                            {idx + 1}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted whitespace-nowrap">{label}</p>
                      </div>
                      {idx < arr.length - 1 && (
                        <ArrowRight size={12} className="text-border-2 shrink-0 mb-4" />
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Filters ──────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="page-container">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Your goal, validated by AI
            </h2>
            <p className="text-text-muted">
              Not every goal enters the system. We apply 4 filters to ensure
              your goal will actually produce something real.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {FILTERS.map(({ key, desc, pass, fail }) => (
              <div key={key} className="card">
                <h3 className="font-semibold text-text-primary mb-2">{key}</h3>
                <p className="text-sm text-text-muted mb-4">{desc}</p>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={13} className="text-success mt-0.5 shrink-0" />
                    <span className="text-success/90">&ldquo;{pass}&rdquo;</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <XCircle size={13} className="text-danger mt-0.5 shrink-0" />
                    <span className="text-danger/90 line-through">&ldquo;{fail}&rdquo;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deliverable system callout ──────────────────────── */}
      <section className="py-20 border-t border-border bg-surface">
        <div className="page-container">
          <div className="max-w-3xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  We don&apos;t track activity.{" "}
                  <span className="gradient-text">We validate outcomes.</span>
                </h2>
                <p className="text-text-muted mb-6">
                  Most productivity tools reward motion. We reward shipping.
                  Every week, you submit a real artifact — or you don&apos;t.
                  The record speaks for itself.
                </p>
                <ul className="space-y-3">
                  {[
                    "Forces output, not just activity",
                    "Makes progress visible and real",
                    "Builds a portfolio of shipped work",
                    "Light accountability — no heavy friction",
                  ].map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle2 size={14} className="text-success shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mock progress card */}
              <div className="bg-surface-2 border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Build an AI SaaS</p>
                    <p className="text-xs text-text-muted mt-0.5">Week 3 of 6</p>
                  </div>
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-text-muted mb-1.5">
                    <span>Progress</span>
                    <span>50%</span>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-primary to-accent rounded-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { week: 1, label: "Auth + DB schema", status: "verified" },
                    { week: 2, label: "Core AI feature", status: "submitted" },
                    { week: 3, label: "Payments + deploy", status: "pending" },
                  ].map(({ week, label, status }) => (
                    <div
                      key={week}
                      className="flex items-center gap-3 bg-surface-3 rounded-lg px-3 py-2"
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          status === "verified"
                            ? "bg-success text-white"
                            : status === "submitted"
                            ? "bg-primary text-white"
                            : "bg-surface border border-border text-text-muted"
                        }`}
                      >
                        {status === "verified" || status === "submitted"
                          ? "✓"
                          : week}
                      </div>
                      <p className="text-xs text-text-primary flex-1">{label}</p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          status === "verified"
                            ? "text-success"
                            : status === "submitted"
                            ? "text-primary-light"
                            : "text-text-muted"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="py-24 border-t border-border">
        <div className="page-container text-center">
          <div className="max-w-2xl mx-auto">
            <div className="relative inline-block mb-2">
              <BarChart3 size={40} className="text-primary mx-auto mb-4 opacity-80" />
            </div>
            <h2 className="text-4xl font-black mb-4 text-balance">
              Ready to actually ship?
            </h2>
            <p className="text-text-muted mb-10 text-lg">
              Set your goal. Let AI build the plan. Ship weekly.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg shadow-xl shadow-primary/20"
            >
              Start building for free
              <ArrowRight size={18} />
            </Link>
            <p className="text-xs text-text-muted mt-4">
              Free to use · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
            <span className="w-5 h-5 bg-primary rounded flex items-center justify-center text-white text-xs font-black">
              N
            </span>
            Nudg
          </div>
          <p>© {new Date().getFullYear()} Nudg. Built for builders who ship.</p>
        </div>
      </footer>
    </div>
  );
}
