# Nudg

**Making builders ship.**

Nudg turns vague ideas into structured weekly execution plans — with AI validation, real deliverable tracking, and accountability built in. You don't log effort. You submit proof.

## What it does

1. **Validate your goal** — AI runs it through 4 filters (externally verifiable, 1–12 week arc, professionally valuable, user-controlled). Vague goals get rejected with feedback.
2. **Generate the plan** — A week-by-week breakdown with 3–5 concrete micro-tasks per deliverable.
3. **Submit real output** — Each week you submit a link, file, or demo. No activity tracking. Outcomes only.
4. **Stay accountable** — Celebrate when you ship. Get nudged when you go quiet.

## Goal validation filters

Every goal must pass before entering the system:

| Filter | Rule |
|---|---|
| Externally verifiable | Produces a URL, repo, deployed app, or file |
| 1–12 week arc | Each week yields a submittable artifact |
| Professionally valuable | Builds toward career or business outcomes |
| User-controlled | Outcome depends entirely on the user's own work |

## Tech stack

- **Next.js 15** (App Router, TypeScript, Turbopack)
- **Tailwind CSS** (custom dark design system)
- **Supabase** (PostgreSQL + Auth + Row Level Security)
- **Google Gemini API** (`gemini-2.5-flash`) — goal validation + plan generation

## Setup

### 1. Clone and install

```bash
git clone https://github.com/zhenzheny/Nudg.git
cd Nudg
npm install
```

### 2. Environment variables

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |

> The project uses a shared Supabase instance. Collaborators get the `.env.local` values from the project owner — no migration needed.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup
│   ├── (dashboard)/     # Dashboard, goals, progress
│   ├── api/             # REST API routes
│   └── page.tsx         # Landing page
├── components/
│   ├── ui/              # Button, Input, Badge, Textarea
│   ├── layout/          # Navbar
│   ├── goals/           # GoalCard
│   ├── deliverables/    # SubmissionForm
│   └── tasks/           # TaskList
├── lib/
│   ├── supabase/        # Server and client Supabase clients
│   ├── anthropic.ts     # AI validation + planning
│   └── utils.ts         # Helpers
└── types/index.ts       # Domain types
```
