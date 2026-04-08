import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Deliverable, Goal } from "@/types";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate which week number a goal is currently on
export function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(Math.floor(diffDays / 7) + 1, 52);
}

// Get due date for a specific week
export function getWeekDueDate(startDate: string, weekNumber: number): Date {
  const start = new Date(startDate);
  const dueDate = new Date(start);
  dueDate.setDate(dueDate.getDate() + weekNumber * 7);
  return dueDate;
}

// Days remaining until week deadline
export function getDaysRemaining(startDate: string, weekNumber: number): number {
  const due = getWeekDueDate(startDate, weekNumber);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format relative time
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date);
}

// Calculate goal completion percentage
export function getGoalProgress(goal: Goal): number {
  if (!goal.deliverables || goal.deliverables.length === 0) return 0;
  const submitted = goal.deliverables.filter(
    (d) => d.status === "submitted" || d.status === "verified"
  ).length;
  return Math.round((submitted / goal.deliverables.length) * 100);
}

// Calculate task completion for a deliverable
export function getDeliverableTaskProgress(deliverable: Deliverable): {
  completed: number;
  total: number;
  percentage: number;
} {
  if (!deliverable.tasks || deliverable.tasks.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }
  const completed = deliverable.tasks.filter((t) => t.status === "completed").length;
  const total = deliverable.tasks.length;
  return { completed, total, percentage: Math.round((completed / total) * 100) };
}

// Calculate submission streak
export function calculateStreak(deliverables: Deliverable[]): number {
  const sorted = [...deliverables].sort((a, b) => a.week_number - b.week_number);
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].status === "submitted" || sorted[i].status === "verified") {
      streak++;
    } else if (sorted[i].status === "missed") {
      break;
    }
  }
  return streak;
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// Pluralize a word based on count
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
