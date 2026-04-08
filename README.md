# Nudg

**Ship weekly. Build credibility. Break in.**

Nudg turns vague ideas into structured weekly execution plans with built-in accountability. Every week, you submit a real deliverable — a link, demo, or file. No activity tracking. Only outcomes.

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Set up Supabase

Run the migration in your Supabase project's SQL editor:

```sql
-- Copy and run: supabase/migrations/001_initial_schema.sql
```

Or if you have the Supabase CLI:

```bash
supabase db push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, signup
│   ├── (dashboard)/     # Dashboard, goals, progress
│   ├── api/             # REST API routes
│   └── page.tsx         # Landing page
├── components/
│   ├── ui/              # Button, Input, Badge, etc.
│   ├── layout/          # Navbar
│   ├── goals/           # GoalCard
│   ├── deliverables/    # SubmissionForm
│   └── tasks/           # TaskList
├── lib/
│   ├── supabase/        # Server and client Supabase clients
│   ├── anthropic.ts     # AI planning and validation
│   └── utils.ts         # Date helpers, progress calc
└── types/index.ts       # All domain types
```

## How goal validation works

Every goal must pass 4 filters before entering the system:

1. **Externally verifiable** — produces a URL, repo, or file
2. **1–12 week arc** — each week yields a submittable artifact
3. **Professionally valuable** — builds toward career/business outcomes
4. **User-controlled** — outcome depends on the user's own work

The AI (`claude-sonnet-4-6`) validates, gives feedback, and if the goal passes, generates a full weekly plan with 3–5 micro-tasks per deliverable.

## Tech stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** (custom dark design system)
- **Supabase** (PostgreSQL + Auth + Row Level Security)
- **Anthropic Claude API** (goal validation + planning)
