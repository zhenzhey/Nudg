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
  week_number: number;
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
export interface AIPlan {
  goal_title: string;
  goal_description: string;
  duration_weeks: number;
  weeks: AIWeekPlan[];
}

export interface AIWeekPlan {
  week_number: number;
  deliverable_title: string;
  deliverable_description: string;
  outcome_description: string;
  tasks: AITask[];
}

export interface AITask {
  title: string;
  description: string;
  estimated_hours: number;
}

// Validation types
export interface ProjectValidation {
  valid: boolean;
  score: number;
  filters: {
    externally_verifiable: boolean;
    week_arc: boolean;
    professionally_valuable: boolean;
    user_controlled: boolean;
  };
  feedback: string;
  suggested_rewrite?: string;
}

export type QuestValidation = ProjectValidation;
export type GoalValidation = ProjectValidation;

export interface PlanResponse {
  validation: ProjectValidation;
  plan?: AIPlan;
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