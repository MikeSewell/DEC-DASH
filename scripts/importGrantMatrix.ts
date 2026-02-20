/**
 * Import Grant Matrix data from Excel into the grants table.
 *
 * Usage:
 *   1. Place "Grant Matrix .xlsx" in scripts/ (or adjust EXCEL_PATH below)
 *   2. npx tsx scripts/importGrantMatrix.ts
 *
 * Reads the "ALL GRANTS" sheet and upserts each row by grantKey.
 */

import * as XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Try multiple paths to find the Excel file
const SEARCH_PATHS = [
  path.resolve(__dirname, "Grant Matrix .xlsx"),
  path.resolve(__dirname, "Grant Matrix.xlsx"),
  path.resolve(__dirname, "../Grant Matrix .xlsx"),
  path.resolve(process.env.HOME || "", "Downloads/Grant Matrix .xlsx"),
  path.resolve(process.env.HOME || "", "Downloads/Grant Matrix.xlsx"),
];

// ── Column header → field name mapping ──────────
const COLUMN_MAP: Record<string, string> = {
  "GRANT ID": "grantId",
  "FUNDING STAGE": "fundingStage",
  "FUNDING SOURCE (NAME OF FUNDER)": "fundingSource",
  "PROGRAM FUNDED or GENERAL OPERATING SUPPORT?": "programType",
  "PROGRAM NAME": "programName",
  "AMOUNT AWARDED": "amountAwarded",
  "START DATE": "startDate",
  "END DATE": "endDate",
  "FUNDER CONTACT NAME": "contactName",
  "FUNDER CONTACT PHONE": "contactPhone",
  "FUNDER CONTACT EMAIL": "contactEmail",
  "ACCOUNTS RECEIVABLE STATUS": "arStatus",
  "DATE FUNDS RECEIVED": "dateFundsReceived",
  "PAYMENT OR INVOICE SCHEDULE": "paymentSchedule",
  "GRANT NUMBER": "grantNumber",
  "Q1 REPORT DATE": "q1ReportDate",
  "Q2 REPORT DATE": "q2ReportDate",
  "Q3 REPORT DATE": "q3ReportDate",
  "Q4 REPORT DATE": "q4ReportDate",
  "Notes": "notes",
};

// ── Helpers ──────────

function normalizeFundingStage(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("active")) return "active";
  if (lower.includes("committed")) return "committed";
  if (lower.includes("pending")) return "pending";
  if (lower.includes("cultivating")) return "cultivating";
  if (lower.includes("denied") || lower.includes("decline")) return "denied";
  return lower.replace(/\s+grants?$/i, "").trim() || "active";
}

function excelSerialToISO(serial: number): string {
  // Excel date epoch is Jan 0, 1900 (with the Lotus 1-2-3 leap year bug)
  const utcDays = serial - 25569; // diff between Excel epoch and Unix epoch
  const utcMs = utcDays * 86400 * 1000;
  const d = new Date(utcMs);
  return d.toISOString().split("T")[0];
}

function parseDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") {
    // Excel serial number
    if (value > 10000 && value < 100000) {
      return excelSerialToISO(value);
    }
    return undefined;
  }
  const str = String(value).trim();
  if (!str) return undefined;
  // Try parsing as date string
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return str;
}

function generateGrantKey(fundingSource: string, programName?: string): string {
  const parts = [fundingSource, programName].filter(Boolean).join("-");
  return parts
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  const str = String(value).replace(/[$,\s]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

function toString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).trim() || undefined;
}

// ── Main ──────────

async function main() {
  // Find the Excel file
  let filePath: string | undefined;
  for (const p of SEARCH_PATHS) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error("Grant Matrix Excel file not found. Searched:");
    for (const p of SEARCH_PATHS) {
      console.error(`  ${p}`);
    }
    console.error('\nPlace "Grant Matrix .xlsx" in the scripts/ directory.');
    process.exit(1);
  }

  console.log(`Reading ${filePath}...`);
  const workbook = XLSX.readFile(filePath);

  const sheetName = workbook.SheetNames.find((s) =>
    s.toLowerCase().includes("all grants")
  );
  if (!sheetName) {
    console.error(`No "ALL GRANTS" sheet found. Sheets: ${workbook.SheetNames.join(", ")}`);
    process.exit(1);
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  console.log(`Sheet "${sheetName}": ${rawRows.length} raw rows`);

  // Parse and map rows
  const grants: Array<{
    grantKey: string;
    fundingStage: string;
    fundingSource: string;
    programType?: string;
    programName?: string;
    amountAwarded?: number;
    startDate?: string;
    endDate?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    arStatus?: string;
    dateFundsReceived?: string;
    paymentSchedule?: string;
    grantNumber?: string;
    q1ReportDate?: string;
    q2ReportDate?: string;
    q3ReportDate?: string;
    q4ReportDate?: string;
    notes?: string;
    importedAt: number;
  }> = [];

  let currentFundingStage = "active";
  const dateFields = new Set([
    "startDate", "endDate", "dateFundsReceived",
    "q1ReportDate", "q2ReportDate", "q3ReportDate", "q4ReportDate",
  ]);

  for (const raw of rawRows) {
    // Map columns
    const mapped: Record<string, unknown> = {};
    for (const [col, value] of Object.entries(raw)) {
      const field = COLUMN_MAP[col] || COLUMN_MAP[col.trim()];
      if (field && value !== undefined && value !== null && value !== "") {
        mapped[field] = value;
      }
    }

    // Update current funding stage from "stage header" rows
    if (mapped.fundingStage) {
      currentFundingStage = normalizeFundingStage(String(mapped.fundingStage));
    }

    // Skip rows without a funding source (header/separator rows)
    const fundingSource = toString(mapped.fundingSource);
    if (!fundingSource) continue;

    const programName = toString(mapped.programName);
    const grantKey = generateGrantKey(fundingSource, programName);

    // Parse date fields
    const parsedDates: Record<string, string | undefined> = {};
    for (const df of dateFields) {
      parsedDates[df] = parseDate(mapped[df]);
    }

    grants.push({
      grantKey,
      fundingStage: currentFundingStage,
      fundingSource,
      programType: toString(mapped.programType),
      programName,
      amountAwarded: parseAmount(mapped.amountAwarded),
      startDate: parsedDates.startDate,
      endDate: parsedDates.endDate,
      contactName: toString(mapped.contactName),
      contactPhone: toString(mapped.contactPhone),
      contactEmail: toString(mapped.contactEmail),
      arStatus: toString(mapped.arStatus),
      dateFundsReceived: parsedDates.dateFundsReceived,
      paymentSchedule: toString(mapped.paymentSchedule),
      grantNumber: toString(mapped.grantNumber),
      q1ReportDate: parsedDates.q1ReportDate,
      q2ReportDate: parsedDates.q2ReportDate,
      q3ReportDate: parsedDates.q3ReportDate,
      q4ReportDate: parsedDates.q4ReportDate,
      notes: toString(mapped.notes),
      importedAt: Date.now(),
    });
  }

  console.log(`Parsed ${grants.length} grants across stages:`);
  const stageCounts: Record<string, number> = {};
  for (const g of grants) {
    stageCounts[g.fundingStage] = (stageCounts[g.fundingStage] || 0) + 1;
  }
  for (const [stage, count] of Object.entries(stageCounts)) {
    console.log(`  ${stage}: ${count}`);
  }

  // Batch upsert in chunks of 20 (Convex mutation size limits)
  const BATCH_SIZE = 20;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE);
    const result = await client.mutation(api.grants.importBatch, {
      grants: batch,
    });
    totalInserted += result.inserted;
    totalUpdated += result.updated;
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted=${result.inserted}, updated=${result.updated}`);
  }

  console.log(`\nDone! Inserted: ${totalInserted}, Updated: ${totalUpdated}, Total: ${grants.length}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
