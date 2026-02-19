import { DashboardSectionId } from "@/types";

export const APP_NAME = "DEC Dashboard";
export const APP_DESCRIPTION = "Dads Evoking Change — Operations Dashboard";

// Dashboard sections in default order
export const DEFAULT_DASHBOARD_SECTIONS: {
  id: DashboardSectionId;
  title: string;
  description: string;
}[] = [
  {
    id: "executive-snapshot",
    title: "Executive Snapshot",
    description: "Key metrics at a glance",
  },
  {
    id: "grant-budget",
    title: "Grant Budget",
    description: "Budget vs actual per grant",
  },
  {
    id: "grant-tracking",
    title: "Grant Tracking",
    description: "Active grants and deadlines",
  },
  {
    id: "donation-performance",
    title: "Donation Performance",
    description: "Donation trends and sources",
  },
  {
    id: "profit-loss",
    title: "Profit & Loss",
    description: "Revenue, expenses, and net income",
  },
  {
    id: "programs-coparent",
    title: "Programs — Co-Parent",
    description: "Co-parent program enrollment and outcomes",
  },
  {
    id: "programs-legal",
    title: "Programs — Legal",
    description: "Legal program enrollment and outcomes",
  },
];

// Navigation items
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Expenses", href: "/expenses", icon: "Receipt" },
  { label: "Newsletter", href: "/newsletter", icon: "Mail" },
  { label: "AI Director", href: "/ai-director", icon: "MessageSquare" },
  { label: "Programs", href: "/programs", icon: "Users" },
  { label: "Admin", href: "/admin", icon: "Settings" },
] as const;

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = ["readonly", "staff", "manager", "admin"] as const;

// QB sync interval in ms (15 minutes)
export const QB_SYNC_INTERVAL_MS = 15 * 60 * 1000;

// Sheets sync interval in ms (30 minutes)
export const SHEETS_SYNC_INTERVAL_MS = 30 * 60 * 1000;

// Theme
export const BRAND_COLORS = {
  primary: "#1B4D3E",      // DEC dark green
  primaryLight: "#2D7A5F", // lighter green
  accent: "#D4A843",       // gold
  accentLight: "#E8C96A",  // light gold
  dark: "#0F2A1F",         // very dark green
  light: "#F5F7F5",        // off-white green tint
};
