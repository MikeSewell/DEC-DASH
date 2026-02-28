import { Id } from "../../convex/_generated/dataModel";

// User roles
export type UserRole = "admin" | "manager" | "staff" | "lawyer" | "psychologist" | "readonly";

// Grant status (grantsCache — Sheets sync)
export type GrantStatus = "active" | "pending" | "completed" | "cultivating";

// Funding stage (grants table — Excel import)
export type FundingStage = "active" | "committed" | "pending" | "cultivating" | "denied";

// Client status
export type ClientStatus = "active" | "completed" | "withdrawn";

// Program types
export type ProgramType = "coparent" | "legal" | "fatherhood" | "other";

// Goal status
export type GoalStatus = "in_progress" | "completed" | "not_started";

// Newsletter status
export type NewsletterStatus = "draft" | "review" | "published";

// AI Director message role
export type MessageRole = "user" | "assistant";

// QB report types
export type QBReportType =
  | "profit_loss"
  | "balance_sheet"
  | "expenses"
  | "vendors"
  | "accounts"
  | "classes"
  | "cash_flow"
  | "donations";

// Dashboard section IDs
export type DashboardSectionId =
  | "executive-snapshot"
  | "grant-budget"
  | "grant-tracking"
  | "donation-performance"
  | "profit-loss"
  | "programs-coparent"
  | "programs-legal"
  | "client-activity";

// Newsletter sections shape
export interface NewsletterSections {
  // Welcome & Leadership
  welcomeMessage?: string;
  recentMilestones?: string;
  personalReflections?: string;
  // Programs
  programUpdates?: string;
  programHighlights?: string;
  participantTestimonials?: string;
  upcomingEvents?: string;
  // Dad of the Month
  dadOfMonthName?: string;
  dadOfMonthStory?: string;
  photoLink?: string;
  // Community & Partnerships
  communityEvents?: string;
  partnerships?: string;
  // Fatherhood Stats & Support
  fatherhoodStat?: string;
  volunteerNeeds?: string;
  donationCampaigns?: string;
  readerSupport?: string;
  // Stay Connected
  contactInfo?: string;
  socialMediaCTA?: string;
  additionalNotes?: string;
}

// QuickBooks P&L data shape
export interface ProfitLossData {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  revenueByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  period: { start: string; end: string };
}

// Expense item
export interface ExpenseItem {
  id: string;
  date: string;
  vendor: string;
  account: string;
  class?: string;
  amount: number;
  memo?: string;
}

// Grant data
export interface GrantData {
  _id?: Id<"grantsCache">;
  sheetRowId: string;
  grantName: string;
  funder: string;
  totalAmount: number;
  amountSpent?: number;
  startDate: string;
  endDate: string;
  status: GrantStatus;
  restrictions?: string;
  deadlines?: string[];
  notes?: string;
}

// Chart data point
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}
