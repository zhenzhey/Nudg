// Sync a single task's schedule to the user's Nudg sub-calendar.
// All functions are no-ops if the user hasn't connected Google.

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import {
  createTaskEvent,
  updateTaskEvent,
  deleteTaskEvent,
} from "./calendar";
import { GoogleNotConnectedError, isGoogleConnected } from "./token";

function admin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface TaskForSync {
  id: string;
  title: string;
  description?: string | null;
  scheduled_date: string | null;
  scheduled_time: number | null;
  estimated_hours: number | null;
  google_event_id: string | null;
}

function buildTimes(task: TaskForSync): { start: Date; end: Date } | null {
  if (!task.scheduled_date || task.scheduled_time == null) return null;
  const [y, m, d] = task.scheduled_date.split("-").map(Number);
  const hour = Math.floor(task.scheduled_time);
  const minute = Math.round((task.scheduled_time - hour) * 60);
  const start = new Date(y, m - 1, d, hour, minute);
  const dur = Math.max(0.5, task.estimated_hours ?? 1);
  const end = new Date(start.getTime() + dur * 3_600_000);
  return { start, end };
}

function buildDescription(task: TaskForSync, appUrl: string): string {
  const lines: string[] = [];
  if (task.description) lines.push(task.description, "");
  lines.push("──────────");
  lines.push(`Open in Nudg: ${appUrl}/tasks/${task.id}`);
  return lines.join("\n");
}

// Create or update the Google event for this task. Persists google_event_id on first create.
export async function upsertTaskEvent(userId: string, task: TaskForSync): Promise<void> {
  if (!(await isGoogleConnected(userId))) return;
  const times = buildTimes(task);
  if (!times) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const eventInput = {
    title: task.title,
    description: buildDescription(task, appUrl),
    start: times.start,
    end: times.end,
  };

  try {
    if (task.google_event_id) {
      await updateTaskEvent(userId, task.google_event_id, eventInput);
      return;
    }
    const eventId = await createTaskEvent(userId, eventInput);
    await admin()
      .from("tasks")
      .update({ google_event_id: eventId })
      .eq("id", task.id);
  } catch (e) {
    if (e instanceof GoogleNotConnectedError) return;
    // Don't fail the whole request if calendar sync fails — log and move on.
    // Phase 2's reconcile pass can heal the divergence.
    console.error("[google-sync] upsert failed", { taskId: task.id, error: e });
  }
}

// Delete the Google event for this task, if any. Safe to call even if not linked.
export async function removeTaskEvent(userId: string, eventId: string | null): Promise<void> {
  if (!eventId) return;
  if (!(await isGoogleConnected(userId))) return;
  try {
    await deleteTaskEvent(userId, eventId);
  } catch (e) {
    if (e instanceof GoogleNotConnectedError) return;
    console.error("[google-sync] delete failed", { eventId, error: e });
  }
}

// When a task is unscheduled (date/time cleared), remove its event but keep the task.
export async function clearTaskEvent(userId: string, task: { id: string; google_event_id: string | null }): Promise<void> {
  if (!task.google_event_id) return;
  await removeTaskEvent(userId, task.google_event_id);
  await admin()
    .from("tasks")
    .update({ google_event_id: null })
    .eq("id", task.id);
}
