import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync QuickBooks data every 15 minutes
crons.interval(
  "quickbooks-sync",
  { minutes: 15 },
  internal.quickbooksSync.runSync
);

// Sync Google Sheets grant tracker every 30 minutes
crons.interval(
  "sheets-sync",
  { minutes: 30 },
  internal.googleSheetsSync.runSync
);

// Sync Google Calendar events every 30 minutes
crons.interval(
  "google-calendar-sync",
  { minutes: 30 },
  internal.googleCalendarSync.runSync
);

export default crons;
