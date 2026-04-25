// Core domain types for Nudg

export type ProjectStatus = "active" | "completed" | "abandoned";
// Backward compat aliases
export type QuestStatus = ProjectStatus;
export type DeliverableStatus = "pending" | "submitted" | "verified" | "missed";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type VerificationType =
  | "manual_upload"
  | "github_commit"
  | "google_doc"
  | "screenshot"
  | "referee_approval";

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  manual_upload: "Manual Upload",
  github_commit: "GitHub Commit",
  google_doc: "Google Doc Edit",
  screenshot: "Screenshot",
  referee_approval: "Referee Approval",
};

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  duration_weeks: number;
  status: ProjectStatus;
  start_date: string;
  ai_plan: AIPlan | null;
  created_at: string;
  updated_at: string;
  // Relations (joined)
  deliverables?: Deliverable[];
}

// Backward compat aliases
export type Quest = Project;
export type Goal = Project;
export type GoalStatus = ProjectStatus;

export interface Deliverable {
  id: string;
  goal_id: string;
  // Legacy: weekly cadence. Now nullable; new milestone plans leave this null
  // and rely on order_index + due_date instead.
  week_number: number | null;
  order_index: number;
  estimated_hours: number | null;
  title: string;
  description: string | null;
  outcome_description: string | null;
  due_date: string | null;
  status: DeliverableStatus;
  verification_type: VerificationType;
  submission_url: string | null;
  submission_notes: string | null;
  submitted_at: string | null;
  created_at: string;
  // Relations (joined)
  tasks?: Task[];
}

export interface Task {
  id: string;
  deliverable_id: string | null;  // null for standalone calendar tasks
  user_id?: string | null;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  status: TaskStatus;
  scheduled_date: string | null;  // ISO date "YYYY-MM-DD"
  scheduled_time: number | null;  // hours float, e.g. 14.5 = 2:30pm
  completed_at: string | null;
  created_at: string;
}

// AI planning types
export type Intensity = "casual" | "steady" | "intense";

export interface AIPlan {
  goal_title: string;
  goal_description: string;
  duration_weeks: number;
  total_estimated_hours: number;
  deliverables: AIDeliverable[];
}

export interface AIDeliverable {
  order_index: number;
  title: string;
  description: string;
  outcome_description: string;
  estimated_hours: number;
  rationale: string;
  confidence_score: number;
  task_sketch: Array<{ label: string; hours: number }>;
}

export interface AITask {
  title: string;
  description: string;
  estimated_hours: number;
}

// Feasibility (replaces the old 4-filter validator)
export interface FeasibilityResult {
  feasible: boolean;
  reason: string;
  suggested_rescope?: string;
}

export interface CriticVerdict {
  status: "PASS" | "REJECT";
  feedback: string;
  issues?: string[];
  revised: boolean;
}

export interface PlanResponse {
  feasibility: FeasibilityResult;
  plan?: AIPlan;
  critic?: CriticVerdict;
}

// Clarification interview — asked between input and validation
export type InterviewDimension = "baseline" | "definition_of_done" | "constraints";

export interface InterviewQuestion {
  question: string;
  dimension: InterviewDimension;
  options: string[];
}

export interface InterviewAnswer {
  question: string;
  dimension: InterviewDimension;
  answer: string;
  selected_option_index: number | null;
}

// Dashboard types
export interface ProjectProgress {
  project: Project;
  current_week: number;
  weeks_completed: number;
  deliverables_submitted: number;
  deliverables_total: number;
  current_deliverable: Deliverable | null;
  streak: number;
  on_track: boolean;
}

export type QuestProgress = ProjectProgress;
export type GoalProgress = ProjectProgress;