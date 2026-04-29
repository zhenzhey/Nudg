// Google Calendar API wrapper. All functions take a userId and handle
// token refresh + Nudg-calendar provisioning under the hood.
//
// Events are written to a dedicated "Nudg Tasks" sub-calendar (auto-created
// on first use) so users can toggle Nudg's output independent of their
// existing calendars.

import {
  getValidAccessToken,
  getCalendarId,
  setCalendarId,
} from "./token";

const API_BASE = "https://www.googleapis.com/calendar/v3";
const NUDG_CALENDAR_NAME = "Nudg Tasks";

interface GoogleEventTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
  status?: string;
}

export interface BusyInterval {
  start: Date;
  end: Date;
  title?: string;
}

interface AuthedFetchOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
}

async function authedFetch<T>(
  userId: string,
  path: string,
  opts: AuthedFetchOptions = {}
): Promise<T> {
  const token = await getValidAccessToken(userId);
  const url = new URL(`${API_BASE}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar ${opts.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  // 204 no content (e.g. delete)
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Create the Nudg sub-calendar if not yet provisioned for this user.
export async function ensureNudgCalendar(userId: string): Promise<string> {
  const existing = await getCalendarId(userId);
  if (existing) return existing;

  const created = await authedFetch<{ id: string }>(userId, "/calendars", {
    method: "POST",
    body: {
      summary: NUDG_CALENDAR_NAME,
      description: "Tasks scheduled by Nudg. You can toggle this calendar on/off in Google Calendar.",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  await setCalendarId(userId, created.id);
  return created.id;
}

// List events on the user's primary calendar in [timeMin, timeMax].
// Used to find busy times to avoid when scheduling.
// We intentionally only read `primary` (not the Nudg sub-calendar) so Nudg
// doesn't conflict with itself.
export async function listPrimaryBusy(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusyInterval[]> {
  const data = await authedFetch<{ items?: GoogleEvent[] }>(
    userId,
    "/calendars/primary/events",
    {
      query: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      },
    }
  );

  const items = data.items ?? [];
  const intervals: BusyInterval[] = [];
  for (const ev of items) {
    if (ev.status === "cancelled") continue;
    // Skip all-day events (date-only) — they don't block specific hours.
    if (!ev.start.dateTime || !ev.end.dateTime) continue;
    intervals.push({
      start: new Date(ev.start.dateTime),
      end: new Date(ev.end.dateTime),
      title: ev.summary,
    });
  }
  return intervals;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start: Date;
  end: Date;
}

export async function createTaskEvent(
  userId: string,
  input: CreateEventInput
): Promise<string> {
  const calendarId = await ensureNudgCalendar(userId);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const created = await authedFetch<{ id: string }>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      body: {
        summary: input.title,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: tz },
        end: { dateTime: input.end.toISOString(), timeZone: tz },
      },
    }
  );
  return created.id;
}

export async function updateTaskEvent(
  userId: string,
  eventId: string,
  input: CreateEventInput
): Promise<void> {
  const calendarId = await ensureNudgCalendar(userId);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await authedFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: {
        summary: input.title,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: tz },
        end: { dateTime: input.end.toISOString(), timeZone: tz },
      },
    }
  );
}

export async function deleteTaskEvent(userId: string, eventId: string): Promise<void> {
  const calendarId = await ensureNudgCalendar(userId);
  await authedFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" }
  );
}

// Helper: hour-of-day busy intervals on a specific YYYY-MM-DD, in user's local time.
// Returned as { start: hour, duration: hours } pairs that match scheduler.ts shape.
export function busyToOccupiedSlots(
  busy: BusyInterval[],
  date: string
): Array<{ start: number; duration: number }> {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  const slots: Array<{ start: number; duration: number }> = [];
  for (const b of busy) {
    if (b.end <= dayStart || b.start >= dayEnd) continue;
    const s = b.start < dayStart ? dayStart : b.start;
    const e = b.end > dayEnd ? dayEnd : b.end;
    const startHour = s.getHours() + s.getMinutes() / 60;
    const durHours = (e.getTime() - s.getTime()) / 3_600_000;
    if (durHours > 0) slots.push({ start: startHour, duration: durHours });
  }
  return slots;
}
