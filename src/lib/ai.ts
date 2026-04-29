import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  PlanResponse,
  AIPlan,
  CriticVerdict,
  FeasibilityResult,
  Intensity,
  InterviewAnswer,
  InterviewQuestion,
  AITask,
  TaskMetadata,
} from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Hour ranges for each intensity tier. Injected verbatim into the Architect
// and Critic prompts so the model can do arithmetic on
// "intensity_min*duration .. intensity_max*duration" for the total hour budget.
const INTENSITY_HOURS: Record<Intensity, [number, number]> = {
  casual: [3, 7],
  steady: [8, 14],
  intense: [15, 25],
};

const ARCHITECT_PROMPT = `You are a seasoned serial founder and product/technical architect. Your job is to plan the deliverables of a solopreneur/builder project.

You always work in two steps:

STEP 1 — FEASIBILITY CHECK (replaces generic goal validation)
Decide if the goal can plausibly be reached given the user's full picture:
  capability (baseline) + actual constraints + total hour budget (intensity × duration)
  + the specific success metric the user gave in definition_of_done.
Use ALL three clarification dimensions, not just baseline.
If not feasible, return { "feasibility": { "feasible": false, "reason": "...", "suggested_rescope": "..." } }
and STOP. Do NOT generate deliverables.

STEP 2 — DELIVERABLE PLANNING (only if feasible)

Frame each deliverable as a checkpoint along the path to the goal. They are ORDERED in time — later deliverables build on what earlier ones produced. Two things matter most: (1) is each deliverable high-quality and worth shipping, and (2) does the overall order make sense as a progression?

Working principles:
- Cut ruthlessly. Drop everything non-MVP given the time budget.
- Outcome-first. Each deliverable is a verifiable artifact (shipped landing page, deployed API, live demo URL, customer-facing release), NOT an activity ("frontend dev", "research").
- Match capability. Beginners need smaller, confidence-building first deliverables. Experienced builders skip fundamentals and start at real work.
- Respect constraints. If the user said they don't know stack X or have a hard blocker, factor it in.
- Variable size is fine. Deliverables don't need to all be the same size; some may be 4h, some 18h. What matters is the total hours and a sensible cadence.
- Total estimated hours MUST land within the provided hour budget range.

Hour estimation (load-bearing — the Critic checks this):
- For each deliverable, write a task_sketch of 3–5 sub-task fragments with rough hours.
- Set estimated_hours = sum(task_sketch.hours).
- If the user's baseline says they're new to the relevant tech, inflate sketch hours (1.5–2× nominal).
- If baseline shows they already know the stack, use nominal hours.
- Don't write round-number hours without a sketch backing them.

Do NOT generate due_dates. Scheduling is computed downstream from order_index + estimated_hours + the project's start_date and weekly pace, so it can be re-derived as the user's progress shifts. Focus on getting the hours right; the calendar follows.

Business sequencing (context-sensitive — NOT a rigid template):
- Goals involving revenue / users / launch with HIGH uncertainty (no validated demand, vague audience, unproven premise) → frontload validation: landing page, user interviews, distribution test, before heavy build.
- Goals where the user shows CLEAR demand signals (existing audience, inbound interest, well-known problem analogues) → validation can be lighter or interleaved later.
- Internal tools / portfolio pieces / non-monetized goals → no validation deliverable required; go straight to building.
- Never produce a plan that builds everything before any external feedback. Never force a generic "waitlist in week 1" if it doesn't fit the project's shape.
- Cite your reasoning in each deliverable's rationale (≤10 chars, e.g. "validate demand", "core loop", "ship MVP").

Each deliverable must include:
- order_index (0-based, dense, no gaps)
- title, description, outcome_description (exactly what a valid submission looks like)
- task_sketch[], estimated_hours
- rationale (≤10 chars), confidence_score (0..1, how necessary this deliverable is to the goal)

Round 2 only: if Critic feedback is provided, address EVERY issue concretely. Do not regenerate from scratch — fix what was flagged.

Return ONLY valid JSON. No markdown, no explanation, no code blocks.`;

const ARCHITECT_SCHEMA = `{
  "feasibility": {
    "feasible": boolean,
    "reason": "string — concise (1-2 sentences) explanation, even when feasible",
    "suggested_rescope": "string — optional, only when feasible=false: a tighter version of the goal that would fit"
  },
  "plan": {
    "goal_title": "string — concise project title",
    "goal_description": "string — 1-2 sentences on what will be built and why",
    "duration_weeks": number,
    "total_estimated_hours": number,
    "deliverables": [
      {
        "order_index": number,
        "title": "string — concrete artifact",
        "description": "string — what this deliverable produces and why it matters",
        "outcome_description": "string — what a valid submission looks like (URL, repo, demo, etc.)",
        "task_sketch": [
          { "label": "string — sub-task fragment", "hours": number }
        ],
        "estimated_hours": number,
        "rationale": "string — ≤10 chars",
        "confidence_score": number
      }
    ]
  }
}

Rules:
- Omit the "plan" key entirely if feasibility.feasible is false.
- estimated_hours per deliverable MUST equal sum(task_sketch[].hours).
- total_estimated_hours MUST equal sum(deliverables[].estimated_hours).
- 1 ≤ deliverables.length ≤ 10.
- Do NOT include a "tasks" field — micro-tasks are generated separately.`;

const CRITIC_PROMPT = `You are an extremely demanding agile coach and project quality auditor. Audit the plan produced by the Architect with no mercy.

You will be given:
- The original goal, duration_weeks, intensity (with its hour range), and the user's clarification answers.
- The Architect's plan as JSON.

AUDIT CRITERIA — all four must pass for status PASS:

1. TIME MATCH
   - sum(deliverables.estimated_hours) must fall within [intensity_min * duration_weeks, intensity_max * duration_weeks] with ±15% tolerance.
   - No single deliverable is so large it implies an unsustainable burst given the user's per-week capacity (cap any single deliverable at intensity_max * 2 weeks).
   - task_sketch hours must sum to estimated_hours for every deliverable.

2. NECESSITY
   - No "fake deliverables": polished branding without users, premature CI/CD, gold-plating, ceremony, "set up project" as its own deliverable.
   - Every deliverable must materially advance the goal stated in definition_of_done.

3. SEQUENCE & REACHABILITY
   - Deliverables in order_index order form a continuous path from current state (implied by baseline) to the goal in definition_of_done.
   - No logical gaps where one deliverable depends on something that was never built.

4. BUSINESS SENSE (context-sensitive, NOT a rigid template)
   - If the goal involves users / revenue / launch AND the clarification shows uncertainty about audience or demand → validation must appear before heavy build, but the EXACT placement is judgment.
   - If clarification shows clear demand signals or this is internal/portfolio → no validation deliverable is required; do not flag its absence.
   - Reject only when the plan would obviously fail commercially (e.g. building the full product before any external feedback for a high-uncertainty business goal).

OUTPUT
- Pass: {"status": "PASS", "feedback": "", "issues": []}
- Reject: {"status": "REJECT", "feedback": "specific problems + concrete rewrite suggestions for each", "issues": ["time_mismatch" | "fake_deliverable" | "sequence_gap" | "business_misfit" | "estimation_unsupported"]}

Be strict but fair: if the plan is workable, pass it. Do not reject for stylistic preferences.

Return ONLY valid JSON. No markdown, no explanation, no code blocks.`;

const CRITIC_SCHEMA = `{
  "status": "PASS" | "REJECT",
  "feedback": "string — empty when PASS; specific issues + rewrite suggestions when REJECT",
  "issues": ["string — issue tag(s)"]
}`;

// Retry a Gemini call on transient errors (503, 429) or JSON parse failures
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      const isTransient = status === 503 || status === 429;
      const isJsonError = err instanceof SyntaxError;
      if (!isTransient && !isJsonError) throw err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// Strip markdown code fences Gemini sometimes wraps JSON in
function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// ─── Architect + Critic 2-agent loop ─────────────────────────────────────
// planGoal runs the Architect, then the Critic. If the Critic rejects,
// the Architect is given the feedback and produces a revised plan, which
// is returned as-is (no second Critic pass — keeps latency bounded and
// avoids loops). Each call's input + raw output is logged to stdout so
// prompt iteration can be done from the terminal.

function formatClarification(interview?: InterviewAnswer[]): string {
  if (!interview || interview.length === 0) {
    return "(no clarification answers — proceed with reasonable defaults)";
  }
  const grouped: Record<string, string[]> = {
    baseline: [],
    definition_of_done: [],
    constraints: [],
  };
  for (const a of interview) {
    grouped[a.dimension] = grouped[a.dimension] || [];
    grouped[a.dimension].push(`Q: ${a.question}\n   A: ${a.answer}`);
  }
  const sections: string[] = [];
  for (const dim of ["baseline", "definition_of_done", "constraints"] as const) {
    if (grouped[dim].length > 0) {
      sections.push(`[${dim}]\n${grouped[dim].map((s) => "  " + s).join("\n")}`);
    } else {
      sections.push(`[${dim}] (not provided — infer from context)`);
    }
  }
  return sections.join("\n");
}

function buildArchitectInput(
  goalText: string,
  durationWeeks: number,
  intensity: Intensity,
  interview: InterviewAnswer[] | undefined,
  startDateISO: string,
  criticFeedback: string | null,
  userInstructions: string | null
): string {
  const [hMin, hMax] = INTENSITY_HOURS[intensity];
  const totalMin = hMin * durationWeeks;
  const totalMax = hMax * durationWeeks;
  const lines: string[] = [
    `Goal: "${goalText}"`,
    `Duration: ${durationWeeks} weeks (start_date = ${startDateISO})`,
    `Intensity: ${intensity} = ${hMin}–${hMax} hours per week`,
    `Total hour budget: ${totalMin}–${totalMax} hours over the full project`,
    ``,
    `Clarification answers (use ALL three dimensions in your feasibility check and plan):`,
    formatClarification(interview),
    ``,
  ];
  if (userInstructions && userInstructions.trim()) {
    lines.push(
      `USER REGENERATION INSTRUCTIONS (the user just rejected the prior plan and asked for these specific changes — apply them directly, they take priority over your defaults):`,
      userInstructions.trim(),
      ``
    );
  }
  if (criticFeedback) {
    lines.push(
      `CRITIC FEEDBACK (round 2 — your previous plan was rejected; address every issue concretely, do not regenerate from scratch):`,
      criticFeedback,
      ``
    );
  }
  lines.push(`Return JSON matching this schema:\n${ARCHITECT_SCHEMA}`);
  return lines.join("\n");
}

function buildCriticInput(
  goalText: string,
  durationWeeks: number,
  intensity: Intensity,
  interview: InterviewAnswer[] | undefined,
  architectOutput: unknown
): string {
  const [hMin, hMax] = INTENSITY_HOURS[intensity];
  const totalMin = hMin * durationWeeks;
  const totalMax = hMax * durationWeeks;
  return [
    `Goal: "${goalText}"`,
    `Duration: ${durationWeeks} weeks`,
    `Intensity: ${intensity} = ${hMin}–${hMax} hours per week (total budget ${totalMin}–${totalMax}h ±15%)`,
    ``,
    `Clarification answers:`,
    formatClarification(interview),
    ``,
    `Architect's plan to audit:`,
    JSON.stringify(architectOutput, null, 2),
    ``,
    `Return JSON matching this schema:\n${CRITIC_SCHEMA}`,
  ].join("\n");
}

async function runArchitect(userMessage: string, round: 1 | 2): Promise<{
  feasibility: FeasibilityResult;
  plan?: AIPlan;
}> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    systemInstruction: ARCHITECT_PROMPT,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
    },
  });

  console.log(`\n[architect r${round}] ▼▼▼ INPUT ▼▼▼\n${userMessage}\n[architect r${round}] ▼▼▼ END INPUT ▼▼▼\n`);

  return await withRetry(async () => {
    const result = await model.generateContent(userMessage);
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Architect response was truncated — try a shorter goal or fewer weeks");
    }
    const raw = result.response.text();
    console.log(`[architect r${round}] ▲▲▲ RAW OUTPUT ▲▲▲\n${raw}\n[architect r${round}] ▲▲▲ END OUTPUT ▲▲▲\n`);
    const parsed = JSON.parse(stripCodeFences(raw)) as {
      feasibility: FeasibilityResult;
      plan?: AIPlan;
    };
    return parsed;
  });
}

async function runCritic(userMessage: string): Promise<CriticVerdict> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: CRITIC_PROMPT,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  console.log(`\n[critic] ▼▼▼ INPUT ▼▼▼\n${userMessage}\n[critic] ▼▼▼ END INPUT ▼▼▼\n`);

  return await withRetry(async () => {
    const result = await model.generateContent(userMessage);
    const raw = result.response.text();
    console.log(`[critic] ▲▲▲ RAW OUTPUT ▲▲▲\n${raw}\n[critic] ▲▲▲ END OUTPUT ▲▲▲\n`);
    const parsed = JSON.parse(stripCodeFences(raw)) as {
      status: "PASS" | "REJECT";
      feedback: string;
      issues?: string[];
    };
    return { ...parsed, revised: false };
  });
}

export async function planGoal(
  goalText: string,
  durationWeeks: number,
  intensity: Intensity,
  interview?: InterviewAnswer[],
  userInstructions?: string
): Promise<PlanResponse> {
  const startDateISO = new Date().toISOString().slice(0, 10);
  console.log(
    `\n[planGoal] ============================================================` +
      `\n[planGoal] goal="${goalText}"` +
      `\n[planGoal] duration_weeks=${durationWeeks} intensity=${intensity} interview_answers=${interview?.length ?? 0}` +
      `\n[planGoal] user_instructions=${userInstructions ? `"${userInstructions}"` : "(none)"}` +
      `\n[planGoal] ============================================================\n`
  );

  const instructions = userInstructions ?? null;

  // Round 1
  const r1Input = buildArchitectInput(goalText, durationWeeks, intensity, interview, startDateISO, null, instructions);
  const r1 = await runArchitect(r1Input, 1);

  if (!r1.feasibility.feasible || !r1.plan) {
    console.log(`[planGoal] feasibility=false — returning early without Critic\n`);
    return { feasibility: r1.feasibility };
  }

  // Critic
  const criticInput = buildCriticInput(goalText, durationWeeks, intensity, interview, r1);
  const verdict = await runCritic(criticInput);

  if (verdict.status === "PASS") {
    console.log(`[planGoal] critic=PASS — returning round-1 plan\n`);
    return { feasibility: r1.feasibility, plan: r1.plan, critic: verdict };
  }

  // Round 2 (one rewrite, no second critic pass)
  console.log(`[planGoal] critic=REJECT — running architect round 2\n`);
  const r2Input = buildArchitectInput(
    goalText,
    durationWeeks,
    intensity,
    interview,
    startDateISO,
    verdict.feedback,
    instructions
  );
  const r2 = await runArchitect(r2Input, 2);

  // If round 2 declares the goal infeasible, surface that.
  if (!r2.feasibility.feasible || !r2.plan) {
    return { feasibility: r2.feasibility, critic: { ...verdict, revised: true } };
  }

  return {
    feasibility: r2.feasibility,
    plan: r2.plan,
    critic: { ...verdict, revised: true },
  };
}

// Generate 3–5 micro-tasks for a single deliverable (identified by order_index).
// Called after the user has confirmed the deliverable roadmap. Other deliverables
// get their tasks lazily when they unlock.
export async function generateDeliverableTasks(args: {
  projectTitle: string;
  projectDescription: string;
  orderIndex: number;
  deliverableTitle: string;
  deliverableDescription: string;
  outcomeDescription?: string;
  estimatedHours: number;
  allDeliverables: Array<{ order_index: number; title: string }>;
  interview?: InterviewAnswer[];
}): Promise<AITask[]> {
  // Scale task count and per-task cap to the deliverable's actual hour budget.
  const budget = Math.max(1, args.estimatedHours);
  const minTasks = budget <= 4 ? 2 : budget <= 10 ? 3 : budget <= 20 ? 5 : 6;
  const maxTasks = budget <= 4 ? 4 : budget <= 10 ? 5 : budget <= 20 ? 8 : 10;
  const perTaskMax = budget <= 4 ? 2.0 : budget <= 10 ? 3.0 : 4.0;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You generate micro-tasks for a single deliverable in the Nudg app.

RULES:
- ${minTasks}–${maxTasks} micro-tasks total
- Each task: 0.5–${perTaskMax.toFixed(1)} hours, specific and actionable (starts with a verb)
- Tasks should build on each other and fully cover the deliverable
- Total effort budget for this deliverable: ${budget} hours — your tasks' estimated_hours MUST sum to approximately this number (within ±15%). This budget was set upstream; do not contradict it.
- No vague tasks ("work on X", "start Y"). Each task must be independently completable.

Each task ALSO needs two friction-reducing fields:
- start_step: a single concrete sub-action that takes ≤5 minutes and breaks inertia. It must be physical/observable ("open the editor and create file X", "draft a one-line title in Notes", "skim the docs page Y"). Never abstract ("think about", "plan").
- ai_assist: one short sentence telling the user exactly what they could ask an AI to do to make this task easier (e.g. "Ask AI to draft a 3-section outline you can edit"). Be specific to THIS task, not generic.

Both fields must be ≤140 chars, written as direct instructions to the user (imperative voice).

Return ONLY valid JSON. No markdown.`,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const lines: string[] = [
    `Project: "${args.projectTitle}"`,
    `Project description: "${args.projectDescription}"`,
    ``,
    `Full roadmap (for context — do NOT generate tasks for other deliverables):`,
    ...[...args.allDeliverables]
      .sort((a, b) => a.order_index - b.order_index)
      .map((d) => `  D${d.order_index + 1}: ${d.title}`),
    ``,
    `CURRENT DELIVERABLE TO PLAN: D${args.orderIndex + 1}`,
    `Title: "${args.deliverableTitle}"`,
    `Description: "${args.deliverableDescription}"`,
  ];
  if (args.outcomeDescription) {
    lines.push(`Success criterion: "${args.outcomeDescription}"`);
  }
  if (args.interview && args.interview.length > 0) {
    lines.push("");
    lines.push("User context from clarification interview:");
    for (const a of args.interview) {
      lines.push(`- [${a.dimension}] ${a.question} → ${a.answer}`);
    }
  }
  lines.push("");
  lines.push(`Return JSON:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "estimated_hours": number,
      "start_step": "string — ≤5 min kickoff action, ≤140 chars",
      "ai_assist": "string — concrete AI help suggestion, ≤140 chars"
    }
  ]
}`);

  return await withRetry(async () => {
    const result = await model.generateContent(lines.join("\n"));
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Task generation was truncated — retry or simplify the deliverable");
    }
    const text = stripCodeFences(result.response.text());
    const parsed = JSON.parse(text) as { tasks?: AITask[] };
    const tasks = (parsed.tasks ?? []).map((t) => ({
      title: String(t.title ?? "").trim(),
      description: String(t.description ?? "").trim(),
      estimated_hours: Math.max(0.25, Math.min(perTaskMax, Number(t.estimated_hours) || 1.0)),
      start_step: typeof t.start_step === "string" ? t.start_step.trim().slice(0, 200) : undefined,
      ai_assist: typeof t.ai_assist === "string" ? t.ai_assist.trim().slice(0, 200) : undefined,
    }));
    return tasks.filter((t) => t.title.length > 0).slice(0, maxTasks);
  });
}

// Generate just the friction-reducing metadata for an existing task. Used by
// the dashboard to lazily enrich tasks created before the metadata field
// existed (or by the legacy task generator).
export async function generateTaskMetadata(args: {
  taskTitle: string;
  taskDescription: string | null;
  deliverableTitle: string;
  projectTitle: string;
}): Promise<TaskMetadata> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You produce two friction-reducing fields for a single existing task.

start_step: a single concrete sub-action that takes ≤5 minutes and breaks inertia. Physical/observable ("open the editor and create file X", "draft a one-line title in Notes"). Never abstract ("think about", "plan").
ai_assist: one short sentence telling the user exactly what to ask an AI for to make this task easier. Specific to THIS task, not generic.

Both ≤140 chars, imperative voice. Return ONLY valid JSON.`,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  const prompt = [
    `Project: "${args.projectTitle}"`,
    `Deliverable: "${args.deliverableTitle}"`,
    `Task title: "${args.taskTitle}"`,
    args.taskDescription ? `Task description: "${args.taskDescription}"` : "",
    ``,
    `Return JSON: { "start_step": "string", "ai_assist": "string" }`,
  ]
    .filter(Boolean)
    .join("\n");

  return await withRetry(async () => {
    const result = await model.generateContent(prompt);
    const text = stripCodeFences(result.response.text());
    const parsed = JSON.parse(text) as Partial<TaskMetadata>;
    return {
      start_step: typeof parsed.start_step === "string" ? parsed.start_step.trim().slice(0, 200) : undefined,
      ai_assist: typeof parsed.ai_assist === "string" ? parsed.ai_assist.trim().slice(0, 200) : undefined,
    };
  });
}

// Generate 2–3 clarifying questions for a goal — uncertainty-driven.
// The AI picks questions whose answer would change the plan.
const CLARIFY_SYSTEM_PROMPT = `You are Nudg's clarifier. Your job: pick up to 3 questions that would genuinely change the generated weekly plan for THIS specific user and THIS specific goal. Quality over quantity. A single sharp question is better than three generic ones.

═══════════════════════════════════════════
NECESSITY SCORE (required for every question)
═══════════════════════════════════════════
Give each question you propose a necessity_score from 0–10. Be HONEST — the app will FILTER OUT anything scoring below 7 and show the user only the questions that survive.

- 10 — The plan is fundamentally different depending on the answer (e.g. "novice" vs "expert" → different Week 1 deliverable; "$100 MRR" vs "launched waitlist" → different Week N deliverable).
- 8–9 — Meaningfully shifts difficulty, deliverable endpoint, or avoidance strategy.
- 6–7 — Helpful polish but plan skeleton stays similar.
- 0–5 — Nice-to-know. Plan would look nearly identical either way. DO NOT SUBMIT these.

If you cannot honestly score a question ≥ 7, don't include it. If NO question scores ≥ 7, return {"questions": []} — a generic good plan beats 3 annoying questions.

═══════════════════════════════════════════
DIMENSIONS (≤1 question per dimension)
═══════════════════════════════════════════
- baseline — user's skill / relevant experience / stack. Score HIGH only if skill genuinely changes Week 1 (e.g. fundamentals vs. straight to shipping). Score LOW if the goal is skill-agnostic.
- definition_of_done — concrete artifact or metric proving success. Score HIGH when goal uses fuzzy endings ("make money", "launch", "learn", "build something"). Score LOW when goal already names a specific endpoint.
- constraints — time budget / stack / blockers. Score HIGH only if radically different answers give radically different plans. For most goals this is 5–7 (helpful, not decisive).

═══════════════════════════════════════════
CRITICAL QUESTION RULES
═══════════════════════════════════════════
1. NEVER re-ask something the user already stated. If goal says "make money", do NOT ask if they want to monetize — ask how much ($100 MRR? first paying user? 10 customers?). If goal says "in React", do NOT ask what stack.
2. Prefer quantitative / concrete questions. "What outcome?" with chips like "$100 MRR / First paying user / 10 customers" >>> "What's your goal?".
3. Questions must be SHORT — one sentence, <12 words, plain English.
4. No two questions on the same dimension.

═══════════════════════════════════════════
OPTION CHIPS
═══════════════════════════════════════════
- 2 chips if binary; 3 if space truly has 3 distinct regions. Never pad to 3.
- ≤5 words per chip. First-person, concrete, comparable.
- definition_of_done chips MUST be quantitative or named artifacts ("$100 MRR", "First paying user", "Live demo URL", "Published 5 essays"). Never abstract ("something shippable").
- constraints chips should be time buckets or named blockers ("2–4 hrs/week", "5–10 hrs/week", "10+ hrs/week").
- Mutually exclusive. Span the realistic answer space.

═══════════════════════════════════════════
WORKED EXAMPLES
═══════════════════════════════════════════

GOAL: "I want to create an MVP of agentic services and make money from it"
→ Three things are genuinely vague: skill, what counts as "made money", and what "agentic services" even does. All three questions score high. Good output:
{
  "questions": [
    {
      "question": "What signals 'made money from it'?",
      "dimension": "definition_of_done",
      "necessity_score": 10,
      "options": ["First paying user", "$100 MRR", "10 paying customers"]
    },
    {
      "question": "What's your experience shipping AI apps?",
      "dimension": "baseline",
      "necessity_score": 9,
      "options": ["Shipped before", "Tried tutorials", "Brand new"]
    }
  ]
}

GOAL: "Publish a 5-chapter technical blog series on Postgres query planning, one chapter per week, on Medium"
→ Artifact, cadence, venue, topic all stated. Only plausible question is weekly time budget — and even that would produce a similar plan. Score ≤5 → OUTPUT:
{ "questions": [] }

GOAL: "build an iOS app"
→ Everything vague. But asking "what app?" is too open-ended. Ask concrete sharpeners instead:
{
  "questions": [
    {
      "question": "What's the outcome you're aiming for?",
      "dimension": "definition_of_done",
      "necessity_score": 10,
      "options": ["TestFlight demo", "App Store launch", "10 real users"]
    },
    {
      "question": "Have you shipped an iOS app before?",
      "dimension": "baseline",
      "necessity_score": 8,
      "options": ["Yes, multiple", "Tried a tutorial", "First time"]
    }
  ]
}

Return ONLY valid JSON. No markdown, no explanation, no code blocks.`;

// Questions scoring below this are dropped on the server before reaching the UI.
// 7 = "meaningfully shifts difficulty, deliverable, or avoidance strategy".
const NECESSITY_THRESHOLD = 7;

const CLARIFY_SCHEMA = `{
  "questions": [
    {
      "question": "string — one-sentence question, <12 words",
      "dimension": "baseline" | "definition_of_done" | "constraints",
      "necessity_score": number (0-10) — how much the answer changes the plan,
      "options": ["string", "string", "string"]
    }
  ]
}

Notes:
- 0 to 3 questions total — quality over quantity
- Each question has 2 or 3 concrete options
- Options are first-person realistic answers`;

export type ClarifyStatus = "ok" | "empty" | "truncated" | "rate_limited" | "error";

export async function generateClarifyingQuestions(
  goalText: string,
  durationHint?: number,
  intensity?: "casual" | "steady" | "intense"
): Promise<{ questions: InterviewQuestion[]; status: ClarifyStatus; error?: string }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: CLARIFY_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.4,
      // gemini-3-flash-preview spends ~4k tokens on thinking before emitting
      // JSON; 4096 left ~150 for content and truncated mid-question.
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const lines: string[] = [`Goal: "${goalText}"`];
  if (durationHint) lines.push(`Preferred duration: ${durationHint} weeks`);
  if (intensity) lines.push(`Intensity: ${intensity}`);
  lines.push("");
  lines.push(`Return JSON matching this schema:\n${CLARIFY_SCHEMA}`);

  try {
    return await withRetry(async () => {
      const result = await model.generateContent(lines.join("\n"));
      const finishReason = result.response.candidates?.[0]?.finishReason;
      const usage = result.response.usageMetadata;
      const raw = result.response.text();
      const text = stripCodeFences(raw).trim();

      // Full raw response — so we can see exactly what the model is doing.
      console.log("\n[clarify] ▼▼▼ Goal:", JSON.stringify(goalText));
      console.log(
        `[clarify] finishReason=${finishReason} tokens=${usage?.promptTokenCount ?? "?"}p/${
          usage?.candidatesTokenCount ?? "?"
        }c/${usage?.totalTokenCount ?? "?"}t`
      );
      console.log("[clarify] raw AI response:\n" + (text || "(empty)"));

      if (finishReason === "MAX_TOKENS") {
        console.warn(
          "[clarify] TRUNCATED by token limit. Raise maxOutputTokens or simplify the prompt. Returning []"
        );
        return {
          questions: [],
          status: "truncated",
          error: "Model response was cut off by token limit before JSON finished.",
        };
      }
      if (!text) {
        console.warn("[clarify] empty response → returning []");
        return { questions: [], status: "empty", error: "Model returned an empty response." };
      }
      let parsed: {
        questions?: Array<Partial<InterviewQuestion> & { necessity_score?: number }>;
      };
      try {
        parsed = JSON.parse(text);
      } catch {
        console.warn("[clarify] bad JSON → returning []");
        return {
          questions: [],
          status: "error",
          error: "Model returned invalid JSON.",
        };
      }
      const known = ["baseline", "definition_of_done", "constraints"] as const;
      const raw_candidates = (parsed.questions ?? []).map((q) => {
        const score =
          typeof q?.necessity_score === "number"
            ? Math.max(0, Math.min(10, q.necessity_score))
            : 0;
        const opts = Array.isArray(q?.options)
          ? q.options.filter((o): o is string => typeof o === "string" && !!o.trim()).map((o) => o.trim())
          : [];
        return {
          question: typeof q?.question === "string" ? q.question.trim() : "",
          dimension: known.includes(q?.dimension as (typeof known)[number])
            ? (q!.dimension as InterviewQuestion["dimension"])
            : ("baseline" as const),
          necessity_score: score,
          options: opts.slice(0, 3),
        };
      });

      // Log score breakdown so we can tune the threshold.
      console.log("[clarify] scored candidates:");
      raw_candidates.forEach((q, i) => {
        const kept = q.necessity_score >= NECESSITY_THRESHOLD ? "KEEP" : "DROP";
        console.log(
          `  [${i}] ${kept} score=${q.necessity_score} [${q.dimension}] "${q.question}" — [${q.options.join(" | ")}]`
        );
      });

      const questions: InterviewQuestion[] = raw_candidates
        .filter(
          (q) =>
            q.question.length > 0 &&
            q.options.length >= 2 &&
            q.necessity_score >= NECESSITY_THRESHOLD
        )
        .sort((a, b) => b.necessity_score - a.necessity_score)
        .slice(0, 3)
        .map(({ question, dimension, options }) => ({
          question,
          dimension,
          options,
        }));

      console.log(
        `[clarify] ▲▲▲ final: ${questions.length} question(s) shown to user (threshold=${NECESSITY_THRESHOLD})\n`
      );
      return { questions, status: "ok" as const };
    });
  } catch (err) {
    console.warn("[clarify] failed, returning []:", err);
    const status: ClarifyStatus =
      (err as { status?: number }).status === 429 ? "rate_limited" : "error";
    return {
      questions: [],
      status,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Suggest next action steps for a deliverable based on context
export async function suggestNextSteps(
  context: {
    deliverableTitle: string;
    deliverableDescription: string | null;
    projectTitle: string;
    projectDescription: string | null;
    existingPendingTasks: string[];
    completedTasks: string[];
    recentInbox: string[];
  },
  count: 1 | 3
): Promise<Array<{ title: string; estimated_hours: number }>> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are a productivity assistant helping a user figure out their next concrete action steps.

Project: "${context.projectTitle}"${context.projectDescription ? `\nProject description: "${context.projectDescription}"` : ""}
Current deliverable: "${context.deliverableTitle}"${context.deliverableDescription ? `\nDeliverable description: "${context.deliverableDescription}"` : ""}
${context.completedTasks.length > 0 ? `\nRecently completed tasks:\n${context.completedTasks.map((t) => `- ${t}`).join("\n")}` : ""}
${context.existingPendingTasks.length > 0 ? `\nExisting pending tasks (do not duplicate):\n${context.existingPendingTasks.map((t) => `- ${t}`).join("\n")}` : ""}
${context.recentInbox.length > 0 ? `\nRecent notes from the user:\n${context.recentInbox.map((i) => `- ${i}`).join("\n")}` : ""}

Suggest ${count} next concrete action step${count > 1 ? "s" : ""} to make progress on this deliverable. Each step should be:
- Specific and actionable (not vague)
- Completable in 0.5–2 hours
- Building on what has already been done
- Not duplicating existing pending tasks

Return JSON array: [{ "title": "string", "estimated_hours": number }]
estimated_hours: realistic estimate rounded to nearest 0.25 (0.25 = 15 min, 0.5 = 30 min, etc.).`;

  const result = await withRetry(() => model.generateContent(prompt));
  const text = stripCodeFences(result.response.text());
  let parsed: Array<{ title: string; estimated_hours: number }>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`suggestNextSteps: invalid JSON from model — "${text.slice(0, 80)}"`);
  }
  return parsed.slice(0, count).map((s) => ({
    title: s.title,
    estimated_hours: Math.round(Math.max(0.25, s.estimated_hours ?? 1.0) / 0.25) * 0.25,
  }));
}

// Process user input into a task title + description, and estimate duration.
// If the input is already a concise title, keep it as-is.
// If it's a detailed description, generate a short title and preserve the original as description.
export async function processAndEstimateTask(
  userInput: string,
  deliverableTitle: string,
  projectTitle: string
): Promise<{ title: string; description: string | null; estimated_hours: number }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  // Hard rule: long inputs always need summarization. A clean title is rarely
  // longer than ~80 chars; anything beyond 120 is definitionally a note.
  const MUST_SUMMARIZE = userInput.length > 120 || /\n/.test(userInput);

  const prompt = `You are processing a task entry for a productivity app.

Project: "${projectTitle}"
Deliverable: "${deliverableTitle}"
User input: """${userInput}"""

Decide whether this input needs a summarized title:
- Keep as-is ("is_brief": true) ONLY if the input is a short, self-contained task phrase (<= ~80 chars, single line, reads like a title).
- Generate a title ("is_brief": false) if the input is long, multi-line, multi-sentence, contains detailed requirements, pasted notes, or any explanation of context. Long inputs ALWAYS get summarized. Generate a concise title (5–8 words, starts with an action verb, in the same language as the input).

${MUST_SUMMARIZE ? 'NOTE: This input is long or multi-line — you MUST return is_brief=false and generate a concise title.\n\n' : ''}Estimate realistic time to complete this task:
- Use 0.25 for ~15 min tasks, 0.5 for ~30 min, 1.0 for ~1 hr, etc.
- Be honest — if it would take 3 hours, return 3.0. Do not artificially cap the estimate.
- Round to nearest 0.25.

Return JSON:
{
  "is_brief": boolean,
  "title": "string",
  "estimated_hours": number
}`;

  const parsed = await withRetry(async () => {
    const result = await model.generateContent(prompt);
    const text = stripCodeFences(result.response.text());
    return JSON.parse(text) as { is_brief: boolean; title: string; estimated_hours: number };
  });

  const hours = Math.round(Math.max(0.25, parsed.estimated_hours ?? 1.0) / 0.25) * 0.25;
  const isBrief = MUST_SUMMARIZE ? false : parsed.is_brief;
  const aiTitle = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const inputTrimmed = userInput.trim();
  // If we're forcing summarization but AI echoed the input back as title,
  // fall back to a truncated first line rather than keeping the whole note.
  const needsFallback =
    !isBrief && (aiTitle === "" || aiTitle === inputTrimmed || aiTitle.length > 100);
  const finalTitle = needsFallback
    ? inputTrimmed.split(/\n/)[0].slice(0, 80)
    : aiTitle || userInput;
  return {
    title: finalTitle,
    description: isBrief ? null : userInput,
    estimated_hours: hours,
  };
}

// Validate a submitted deliverable against its success criteria
export async function validateSubmission(
  deliverableTitle: string,
  outcomeDescription: string,
  submissionUrl: string,
  submissionNotes: string
): Promise<{ valid: boolean; feedback: string }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are reviewing a weekly deliverable submission.

Deliverable: "${deliverableTitle}"
Success criteria: "${outcomeDescription}"
Submitted URL: "${submissionUrl}"
User notes: "${submissionNotes}"

Does this submission meet the success criteria? Consider:
- A URL or link was provided (strong signal)
- The notes describe real work done
- The submission appears to match what was asked

Return JSON: { "valid": boolean, "feedback": "brief 1-sentence feedback" }`;

  const result = await withRetry(() => model.generateContent(prompt));
  const text = stripCodeFences(result.response.text());
  return JSON.parse(text);
}
