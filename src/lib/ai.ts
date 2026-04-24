import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PlanResponse } from "@/types";

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
  durationHint?: number
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

  const userMessage = durationHint
    ? `Goal: "${goalText}"\nPreferred duration: ${durationHint} weeks\n\nReturn JSON matching this schema:\n${PLAN_SCHEMA}`
    : `Goal: "${goalText}"\n\nReturn JSON matching this schema:\n${PLAN_SCHEMA}`;

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
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are processing a task entry for a productivity app.

Project: "${projectTitle}"
Deliverable: "${deliverableTitle}"
User input: "${userInput}"

Decide whether this input needs a summarized title:
- Keep as-is ("is_brief": true) if: it reads like a clear, self-contained task title — even if it's a full sentence or uses non-English. A short imperative or clear action phrase should stay as-is.
- Generate a title ("is_brief": false) if: it's a multi-sentence explanation, a rambling note, or contains so much detail that a shorter title would genuinely help. Generate a concise title (5–8 words, starts with an action verb).

Estimate realistic time to complete this task:
- Use 0.25 for ~15 min tasks, 0.5 for ~30 min, 1.0 for ~1 hr, etc.
- Be honest — if it would take 3 hours, return 3.0. Do not artificially cap the estimate.
- Round to nearest 0.25.

Return JSON:
{
  "is_brief": boolean,
  "title": "string",
  "estimated_hours": number
}`;

  const result = await withRetry(() => model.generateContent(prompt));
  const text = stripCodeFences(result.response.text());
  let parsed: { is_brief: boolean; title: string; estimated_hours: number };
  try {
    parsed = JSON.parse(text);
  } catch {
    return { title: userInput, description: null, estimated_hours: 1.0 };
  }
  const hours = Math.round(Math.max(0.25, parsed.estimated_hours ?? 1.0) / 0.25) * 0.25;
  return {
    title: parsed.title ?? userInput,
    description: parsed.is_brief ? null : userInput,
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
