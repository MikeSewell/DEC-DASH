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
    id: "client-activity",
    title: "Client Activity",
    description: "Active clients and program breakdown",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Upcoming events and schedule",
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
  { label: "Grants", href: "/grants", icon: "ClipboardList" },
  { label: "Expenses", href: "/expenses", icon: "Receipt" },
  { label: "Newsletter", href: "/newsletter", icon: "Mail" },
  { label: "AI Director", href: "/ai-director", icon: "MessageSquare" },
  { label: "Clients", href: "/clients", icon: "Users" },
  { label: "Admin", href: "/admin", icon: "Settings" },
  { label: "Settings", href: "/settings", icon: "Lock" },
] as const;

// Role-based nav filtering — roles not listed here see all nav items
export const ROLE_NAV_MAP: Record<string, string[]> = {
  lawyer: ["/clients", "/settings"],
  psychologist: ["/clients", "/settings"],
};

// Role-based program type filtering
export const ROLE_PROGRAM_TYPE_MAP: Record<string, string> = {
  lawyer: "legal",
  psychologist: "coparent",
};

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = ["readonly", "psychologist", "lawyer", "staff", "manager", "admin"] as const;

// QB sync interval in ms (15 minutes)
export const QB_SYNC_INTERVAL_MS = 15 * 60 * 1000;

// Sheets sync interval in ms (30 minutes)
export const SHEETS_SYNC_INTERVAL_MS = 30 * 60 * 1000;

// Theme — earthy green palette matching DEC logo
export const BRAND_COLORS = {
  primary: "#2D6A4F",      // earthy forest green
  primaryLight: "#52B788", // medium vibrant green
  accent: "#8CC63F",       // lime green
  accentLight: "#6BBF59",  // medium green
  dark: "#1B4332",         // deep dark forest
  light: "#F5F7F3",        // warm off-white
};

// Calendar dot colors — deterministic index-based assignment from DEC theme palette
export const CALENDAR_DOT_COLORS = [
  "#1B5E6B", // primary teal
  "#6BBF59", // accent green
  "#2B9E9E", // mid teal
  "#8CC63F", // lime
  "#5BBFB5", // light teal
  "#1A7A7A", // dark teal
] as const;
