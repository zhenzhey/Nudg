# Nudg — Technical Overview

Nudg turns a vague goal into a structured weekly execution plan with real accountability. The core idea: validate outcomes, not activity.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL, RLS, cookie-based sessions) |
| AI | Google Gemini 2.5 Flash (planning + submission validation) |
| Input validation | Zod |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login, signup pages
│   ├── (dashboard)/       # Protected app pages
│   │   ├── dashboard/     # Goal overview
│   │   ├── goals/new/     # Goal creation flow
│   │   ├── goals/[id]/    # Goal detail + weekly deliverables
│   │   └── progress/      # Progress tracking
│   └── api/
│       ├── ai/plan/       # POST — AI goal validation + plan generation
│       ├── goals/         # GET / POST goals
│       ├── goals/[id]/    # GET / PATCH / DELETE a goal
│       ├── deliverables/[id]/submit/  # POST — submit a weekly deliverable
│       └── tasks/[id]/complete/       # POST — mark a task complete
├── components/
│   ├── goals/             # GoalCard
│   ├── deliverables/      # SubmissionForm
│   ├── tasks/             # TaskList
│   ├── layout/            # Navbar
│   └── ui/                # Button, Input, Textarea, Badge (primitives)
├── lib/
│   ├── ai.ts              # Gemini API calls (planGoal, validateSubmission)
│   ├── anthropic.ts       # (unused — legacy from earlier Anthropic integration)
│   ├── supabase/
│   │   ├── client.ts      # Browser Supabase client
│   │   └── server.ts      # Server-side Supabase client (SSR cookies)
│   └── utils.ts
├── middleware.ts           # Auth guard for protected routes
└── types/index.ts          # All shared TypeScript types
```

---

## Database Schema

Four tables in Supabase PostgreSQL. All have Row Level Security (RLS) enabled — users can only read or write their own data.

```
auth.users  (Supabase built-in)
    └── profiles       id, username, full_name, avatar_url, bio
            |
            └── goals          id, user_id, title, description,
                               duration_weeks (1–12), status, start_date,
                               ai_plan (JSONB — full AI plan stored for reference)
                    |
                    └── deliverables   id, goal_id, week_number, title,
                                       outcome_description, due_date, status,
                                       submission_url, submission_notes, submitted_at
                            |
                            └── tasks  id, deliverable_id, title, description,
                                       estimated_hours (0.5–2.0), status, completed_at
```

**Status enums:**
- Goal: `active | completed | abandoned`
- Deliverable: `pending | submitted | verified | missed`
- Task: `pending | in_progress | completed`

A profile row is auto-created via a Postgres trigger (`handle_new_user`) whenever a new user signs up.

---

## Auth & Route Protection

Supabase handles auth (email/password). Sessions are stored in cookies and refreshed server-side.

`middleware.ts` runs on every request:
- `/dashboard`, `/goals`, `/progress` → redirect to `/login` if not authenticated
- `/login`, `/signup` → redirect to `/dashboard` if already authenticated

---

## AI Integration

All AI calls go through `src/lib/ai.ts` using the Gemini 2.5 Flash model.

### Goal Planning — `POST /api/ai/plan`

Takes a goal string (and optional duration hint). Returns a `PlanResponse`:

**Step 1 — Validation.** The AI applies 4 filters. The goal must pass all of them:

1. **Externally verifiable** — produces something reviewable: a URL, GitHub repo, deployed app, video, etc. "Learn React" fails. "Deploy a React portfolio" passes.
2. **1–12 week arc** — each week yields a distinct submittable artifact. Too small or too large fails.
3. **Professionally valuable** — builds toward career or business outcomes.
4. **User-controlled** — outcome depends on the user's own work, not others' decisions.

**Step 2 — Planning** (only if all 4 filters pass). The AI generates:
- Weekly deliverables — one concrete artifact per week
- 3–5 micro-tasks per deliverable (~1–2 hours each, totaling 5–10 hours/week)
- A success criterion per week — exactly what counts as "done"

The full plan is saved as JSONB on the `goals` row.

### Submission Validation — `POST /api/deliverables/[id]/submit`

When a user submits a deliverable (URL + notes), the submission is saved to the database and can be validated by the AI against the week's `outcome_description`.

---

## Key API Endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/api/ai/plan` | Validate a goal + generate a weekly plan |
| GET | `/api/goals` | List current user's goals (with deliverables + tasks) |
| POST | `/api/goals` | Create a goal — inserts goal, deliverables, and tasks in one transaction |
| GET/PATCH/DELETE | `/api/goals/[id]` | Read, update, or delete a specific goal |
| POST | `/api/deliverables/[id]/submit` | Submit a weekly deliverable (URL + notes) |
| POST | `/api/tasks/[id]/complete` | Mark a task as complete |

All endpoints check auth via `supabase.auth.getUser()` before touching data. Input is validated with Zod before any DB write.

---

## Data Flow — Creating a Goal

```
User types goal text
        ↓
POST /api/ai/plan          → Gemini validates + generates plan
        ↓
User reviews plan
        ↓
POST /api/goals            → Inserts goal + deliverables + tasks in sequence
                             Due dates calculated as start_date + (week_number × 7 days)
        ↓
Redirect to /goals/[id]    → User sees their weekly breakdown
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
```

---

## Notable Decisions

- **No daily tracking.** The unit of accountability is a weekly deliverable, not daily tasks. Tasks exist to guide the week but aren't the submission target.
- **AI plan stored as JSONB.** The full AI-generated plan is saved on the goal row so it's always available without re-querying the AI.
- **RLS enforced at the database level.** Even if an API bug passes the wrong user ID, Postgres will reject the query.
- **Zod validation on all writes.** Every API route that accepts input validates it with a Zod schema before touching the database.
- **`lib/anthropic.ts` is unused.** The project was originally built with Claude but migrated to Gemini. That file can be deleted.
