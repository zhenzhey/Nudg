import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  PlanResponse,
  InterviewAnswer,
  InterviewQuestion,
} from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are the Nudg AI planner. Nudg turns vague goals into structured weekly execution plans.

Your job has two phases:

PHASE 1 — GOAL VALIDATION
Apply these 4 filters. The goal must pass ALL of them:
1. Externally verifiable: Must produce something reviewable — a URL, GitHub repo, deployed app, video demo, file, or submission link. "Learn React" fails. "Build and deploy a React portfolio" passes.
2. 1–12 week arc: Each week must yield a distinct, submittable artifact. Goals too small (<1 week) or too large (>12 weeks) fail.
3. Professionally valuable: Must build toward career or business outcomes that matter — portfolio pieces, shipped products, demonstrable skills. "Write a journal" fails. "Build an AI tool and publish it" passes.
4. User-controlled: The outcome must depend on the user's work, not others' decisions. "Get hired at Google" fails. "Build and launch a product" passes.

PHASE 2 — PLANNING (only if all 4 filters pass)
Break the goal into weekly deliverables. Each week has:
- One concrete, submittable deliverable (not a list of activities)
- 3–5 micro-tasks (each ~1–2 hours, totaling 5–10 hours/week)
- A clear success criterion: what exactly counts as "done"

Return ONLY valid JSON. No markdown, no explanation, no code blocks.`;

const PLAN_SCHEMA = `{
  "validation": {
    "valid": boolean,
    "score": number (0-4),
    "filters": {
      "externally_verifiable": boolean,
      "week_arc": boolean,
      "professionally_valuable": boolean,
      "user_controlled": boolean
    },
    "feedback": "string — explain which filters failed and why, or confirm the goal is valid",
    "suggested_rewrite": "string — optional, only if goal is invalid, suggest a revised goal that would pass"
  },
  "plan": {
    "goal_title": "string — concise goal title",
    "goal_description": "string — 1-2 sentence description of what will be built",
    "duration_weeks": number,
    "weeks": [
      {
        "week_number": number,
        "deliverable_title": "string — concrete artifact to ship this week",
        "deliverable_description": "string — what this week builds and why it matters",
        "outcome_description": "string — exactly what a valid submission looks like (URL, repo link, demo video, etc.)",
        "tasks": [
          {
            "title": "string — specific action",
            "description": "string — brief explanation of what to do",
            "estimated_hours": number (0.5–2.0)
          }
        ]
      }
    ]
  }
}

Notes:
- "plan" key is ONLY present if validation.valid is true
- If validation.valid is false, omit the "plan" key entirely
- duration_weeks must be between 1 and 12
- Each week must have 3–5 tasks
- Task estimated_hours must be between 0.5 and 2.0`;

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

// Validate and plan a goal using Gemini
export async function planGoal(
  goalText: string,
  durationHint?: number,
  interview?: InterviewAnswer[]
): Promise<PlanResponse> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 16384,
      responseMimeType: "application/json", // ask Gemini to return pure JSON
    },
  });

  const lines: string[] = [`Goal: "${goalText}"`];
  if (durationHint) lines.push(`Preferred duration: ${durationHint} weeks`);
  if (interview && interview.length > 0) {
    lines.push("");
    lines.push("CLARIFICATION INTERVIEW — the user answered these before planning:");
    for (const a of interview) {
      lines.push(`- [${a.dimension}] ${a.question}`);
      lines.push(`  → ${a.answer}`);
    }
    lines.push("");
    lines.push(
      "CRITICAL: these answers MUST visibly shape the plan. Two users with the same goal but different answers should see meaningfully different plans. Specifically:"
    );
    lines.push(
      "- baseline → set difficulty and entry point. If the user has shipped before, SKIP fundamentals and start at real work. If they're new, start with setup and the smallest shippable piece."
    );
    lines.push(
      "- definition_of_done → the final week's deliverable must match their stated success metric exactly (e.g. '$100 MRR', 'first paying user', 'launched waitlist'). Don't substitute a generic endpoint."
    );
    lines.push(
      "- constraints → remove any week or task that conflicts with stated blockers/time. Prefer tools/stacks they said they already know."
    );
    lines.push(
      "Weave their exact words into deliverable_title/description where natural — it should feel hand-tailored, not generic."
    );
  }
  lines.push("");
  lines.push(`Return JSON matching this schema:\n${PLAN_SCHEMA}`);
  const userMessage = lines.join("\n");

  return await withRetry(async () => {
    const result = await model.generateContent(userMessage);
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      throw new Error("AI response was truncated — try a shorter goal or fewer weeks");
    }
    const text = stripCodeFences(result.response.text());
    return JSON.parse(text) as PlanResponse;
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
    model: "gemini-3-flash-preview",
    systemInstruction: CLARIFY_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.4,
      // gemini-2.5-flash uses "thinking" tokens that eat into this budget
      // before any JSON output is produced. 1024 was being consumed entirely
      // by thinking, truncating the JSON mid-stream. 4096 gives headroom.
      maxOutputTokens: 4096,
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
