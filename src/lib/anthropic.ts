import Anthropic from "@anthropic-ai/sdk";
import type { AIPlan, PlanResponse } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

Return ONLY valid JSON. No markdown, no explanation.`;

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

// Validate and plan a goal using the Claude API
export async function planGoal(
  goalText: string,
  durationHint?: number
): Promise<PlanResponse> {
  const userMessage = durationHint
    ? `Goal: "${goalText}"\nPreferred duration: ${durationHint} weeks`
    : `Goal: "${goalText}"`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${userMessage}\n\nReturn JSON matching this schema:\n${PLAN_SCHEMA}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Strip markdown code blocks if present
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const result = JSON.parse(jsonText) as PlanResponse;
  return result;
}

// Validate a submitted deliverable against its success criteria
export async function validateSubmission(
  deliverableTitle: string,
  outcomeDescription: string,
  submissionUrl: string,
  submissionNotes: string
): Promise<{ valid: boolean; feedback: string }> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are reviewing a weekly deliverable submission.

Deliverable: "${deliverableTitle}"
Success criteria: "${outcomeDescription}"
Submitted URL: "${submissionUrl}"
User notes: "${submissionNotes}"

Does this submission meet the success criteria? Consider:
- A URL or link was provided (strong signal)
- The notes describe real work done
- The submission appears to match what was asked

Return JSON: { "valid": boolean, "feedback": "brief 1-sentence feedback" }`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  let jsonText = content.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonText);
}
