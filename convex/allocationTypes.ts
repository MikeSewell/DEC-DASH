// Shared types & config constants for AI expense categorization
// Pure TypeScript — no Convex functions

export const ALLOCATION_CONFIG = {
  allocation_history_window_days: 30,
  allow_expired_grants: false,
  diversification: {
    mode: "balanced" as const,
    max_concentration_pct_by_vendor: 60,
    max_concentration_pct_by_account: 70,
  },
  pacing: {
    spend_target_curve: "linear" as const,
    underspend_tolerance_pct: 15,
    overspend_tolerance_pct: 10,
  },
  reserves: {
    min_remaining_buffer_pct: 10,
    buffer_release_days_before_end: 45,
  },
};

export interface BudgetCategory {
  account_id: string;
  account_name: string;
  total_budget: number;
  amount_spent: number;
  remaining_budget: number;
  available_after_reserve: number;
  percent_spent: number;
}

export interface GrantProfile {
  class_id: string;
  class_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_expired: boolean;
  remaining_days: number;
  percent_time_elapsed: number;
  pacing: {
    percent_time_elapsed: number;
    percent_budget_spent: number;
    pacing_delta: number;
    pacing_status: "behind_pace" | "on_track" | "ahead_of_pace";
  };
  budget_categories: BudgetCategory[];
}

export interface GrantScore {
  class_id: string;
  class_name: string;
  matching_category: BudgetCategory;
  scores: {
    s1_pacing: number;
    s2_time: number;
    s3_diversification: number;
    s4_budget: number;
    total: number;
  };
  pacing_status: string;
  is_expired: boolean;
  concentration_pct: number;
}

export interface QualifyingGrant extends GrantScore {}

export interface PreScoredExpense {
  purchase_id: string;
  line_id: string;
  sync_token: string;
  txn_date: string;
  vendor_name: string;
  description: string;
  amount: number;
  account_id: string;
  account_name: string;
  current_class: string;
  qualifying_grants: QualifyingGrant[];
  diversification_context: {
    last_grant_used_for_this_vendor_account: string | null;
    grants_already_used: string[];
    concentration_by_grant: Record<string, { amount: number; percent: number }>;
    total_recent_allocations: number;
  } | null;
}

export interface AIRecommendation {
  purchase_id: string;
  line_id: string;
  sync_token: string;
  vendor_name: string;
  amount: number;
  account_name: string;
  action: "reassign" | "flag_for_review";
  suggested_class_id: string | null;
  suggested_class_name: string | null;
  confidence: "high" | "medium" | "low";
  explanation: string;
  scoring_detail: {
    selected_grant_score: number;
    runner_up_grant: string | null;
    runner_up_score: number | null;
  };
}
