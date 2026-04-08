// Core domain types for Nudg

export type GoalStatus = "active" | "completed" | "abandoned";
export type DeliverableStatus = "pending" | "submitted" | "verified" | "missed";
export type TaskStatus = "pending" | "in_progress" | "completed";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  duration_weeks: number;
  status: GoalStatus;
  start_date: string;
  ai_plan: AIPlan | null;
  created_at: string;
  updated_at: string;
  // Relations (joined)
  deliverables?: Deliverable[];
}

export interface Deliverable {
  id: string;
  goal_id: string;
  week_number: number;
  title: string;
  description: string | null;
  outcome_description: string | null;
  due_date: string | null;
  status: DeliverableStatus;
  submission_url: string | null;
  submission_notes: string | null;
  submitted_at: string | null;
  created_at: string;
  // Relations (joined)
  tasks?: Task[];
}

export interface Task {
  id: string;
  deliverable_id: string;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  status: TaskStatus;
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

// Goal validation types

export interface GoalValidation {
  valid: boolean;
  score: number; // 0-4 (how many filters passed)
  filters: {
    externally_verifiable: boolean;
    week_arc: boolean;
    professionally_valuable: boolean;
    user_controlled: boolean;
  };
  feedback: string;
  suggested_rewrite?: string;
}

export interface PlanResponse {
  validation: GoalValidation;
  plan?: AIPlan;
}

// Dashboard types

export interface GoalProgress {
  goal: Goal;
  current_week: number;
  weeks_completed: number;
  deliverables_submitted: number;
  deliverables_total: number;
  current_deliverable: Deliverable | null;
  streak: number;
  on_track: boolean;
}
