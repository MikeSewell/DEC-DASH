/**
 * Import co-parent intake data from Excel into clients + coparentIntakeForms.
 *
 * Usage:
 *   1. Place the Excel file at scripts/Co-parenting Sessions sign in.xlsx
 *   2. npx tsx scripts/importCoparent.ts
 *
 * Reads 3 sheets:
 *   - "Use this sheet" (~66 rows, standard format)
 *   - "End 24 Jan 25" (~21 rows, standard format)
 *   - "Old list" (~103 rows, Father/Mother format)
 *
 * Deduplicates by fullName (keeps most recent row per unique participant).
 * Creates a clients record + coparentIntakeForms record for each.
 */

import * as XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
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

// Only process this sheet
const TARGET_SHEETS = ["Use this sheet"];

// ── Column mappings (matching actual Excel headers exactly) ──────────

// "Use this sheet" and "End 24 Jan 25" share the same column layout
const STANDARD_MAP: Record<string, string> = {
  "Timestamp": "timestamp",
  "Are you Dad or Mom": "role",
  "Your Full Name": "fullName",
  "Your Ethnicity": "ethnicity",
  " Your Date of birth ": "dateOfBirth",
  "Your Date of birth": "dateOfBirth",
  "Your Phone Number": "phone",
  "Your Email": "email",
  "Your Zipcode": "zipCode",
  "Your Age": "age",
  "Full Name of your co-parent": "coParentName",
  "Ethnicity of Co-Parent": "coParentEthnicity",
  "Date of birth of Co-Parent": "coParentDob",
  "Co-parents Phone number:": "coParentPhone",
  "Co-parents Phone number": "coParentPhone",
  "Co-parents email:": "coParentEmail",
  "Co-parents email": "coParentEmail",
  "Zip code of Co-Parent": "coParentZip",
  "Age of Co-Parent": "coParentAge",
  "How did you hear about this program?": "referralSource",
  "Have you informed your Co-parent about this session?": "coParentInformed",
  "Date of session": "sessionDate",
  "Time of session": "sessionTime",
  "How many sessions have you completed?": "sessionsCompleted",
};

// "Old list" sheet — Father/Mother columns
const OLD_LIST_MAP: Record<string, string> = {
  "Father Name": "fullName",
  "Father Race": "ethnicity",
  "Father DOB": "dateOfBirth",
  "Father Phone": "phone",
  "Father Email": "email",
  "Father email": "email",
  "Father Zip": "zipCode",
  "Mother name": "coParentName",
  "Mother Race": "coParentEthnicity",
  "Mother DOB": "coParentDob",
  "Mother Phone": "coParentPhone",
  "Mother Email": "coParentEmail",
  "Mother email": "coParentEmail",
  "Mother Zip": "coParentZip",
  "Date of session": "sessionDate",
  "Session #": "sessionsCompleted",
  "How did they find us?": "referralSource",
};

interface IntakeRow {
  timestamp?: string;
  role?: string;
  fullName?: string;
  ethnicity?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  zipCode?: string;
  age?: string;
  coParentName?: string;
  coParentEthnicity?: string;
  coParentDob?: string;
  coParentPhone?: string;
  coParentEmail?: string;
  coParentZip?: string;
  coParentAge?: string;
  referralSource?: string;
  coParentInformed?: string;
  sessionDate?: string;
  sessionTime?: string;
  sessionsCompleted?: string;
}

function mapRow(
  raw: Record<string, unknown>,
  columnMap: Record<string, string>,
  defaultRole?: string
): IntakeRow {
  const mapped: IntakeRow = {};

  for (const [col, value] of Object.entries(raw)) {
    // Try exact match first, then trimmed
    const field = columnMap[col] || columnMap[col.trim()];
    if (!field) continue;
    if (value !== undefined && value !== null && value !== "") {
      (mapped as Record<string, string>)[field] = String(value).trim();
    }
  }

  if (defaultRole && !mapped.role) {
    mapped.role = defaultRole;
  }

  return mapped;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

async function main() {
  const filePath = path.resolve(__dirname, "Co-parenting Sessions sign in.xlsx");

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error('Place your Excel file at scripts/Co-parenting Sessions sign in.xlsx');
    process.exit(1);
  }

  // Auto-detect co-parent program ID
  console.log("Auto-detecting co-parent program...");
  const programs = await client.query(api.programs.list, {});
  const coparentProgram = programs.find((p) => p.type === "coparent");
  if (!coparentProgram) {
    console.error("No co-parent program found. Run `npx convex run seedPrograms` first.");
    process.exit(1);
  }
  const coparentProgramId = coparentProgram._id;
  console.log(`Found co-parent program: ${coparentProgram.name} (${coparentProgramId})`);

  console.log(`\nReading ${filePath}...`);
  const workbook = XLSX.readFile(filePath);

  // Collect rows from the 3 target sheets only
  const allRows: IntakeRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!TARGET_SHEETS.includes(sheetName)) {
      console.log(`Skipping sheet "${sheetName}"`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const isOldList = sheetName === "Old list";
    const columnMap = isOldList ? OLD_LIST_MAP : STANDARD_MAP;
    const defaultRole = isOldList ? "Dad" : undefined;

    let sheetCount = 0;
    for (const raw of rawRows) {
      const mapped = mapRow(raw, columnMap, defaultRole);
      if (mapped.fullName) {
        allRows.push(mapped);
        sheetCount++;
      }
    }
    console.log(`Sheet "${sheetName}": ${rawRows.length} raw rows → ${sheetCount} with names`);
  }

  console.log(`\nTotal rows with names: ${allRows.length}`);

  // Deduplicate by fullName (normalized) — keep the last occurrence (most recent)
  const deduped = new Map<string, IntakeRow>();
  for (const row of allRows) {
    const key = (row.fullName || "").toLowerCase().trim();
    if (key) {
      deduped.set(key, row);
    }
  }

  const uniqueRows = Array.from(deduped.values());
  console.log(`Unique participants after dedup: ${uniqueRows.length}`);

  // Import one at a time (create client + intake form)
  let totalClients = 0;

  for (let i = 0; i < uniqueRows.length; i++) {
    const row = uniqueRows[i];
    const { firstName, lastName } = parseName(row.fullName || "Unknown");

    try {
      const clientId = await client.mutation(api.clients.create, {
        firstName,
        lastName,
        programId: coparentProgramId,
        status: "active" as const,
        enrollmentDate: Date.now(),
        zipCode: row.zipCode || undefined,
        ethnicity: row.ethnicity || undefined,
      });

      await client.mutation(api.coparentIntake.create, {
        clientId,
        timestamp: row.timestamp,
        role: row.role,
        fullName: row.fullName,
        ethnicity: row.ethnicity,
        dateOfBirth: row.dateOfBirth,
        phone: row.phone,
        email: row.email,
        zipCode: row.zipCode,
        age: row.age,
        coParentName: row.coParentName,
        coParentEthnicity: row.coParentEthnicity,
        coParentDob: row.coParentDob,
        coParentPhone: row.coParentPhone,
        coParentEmail: row.coParentEmail,
        coParentZip: row.coParentZip,
        coParentAge: row.coParentAge,
        referralSource: row.referralSource,
        coParentInformed: row.coParentInformed,
        sessionDate: row.sessionDate,
        sessionTime: row.sessionTime,
        sessionsCompleted: row.sessionsCompleted,
      });

      totalClients++;

      if ((i + 1) % 25 === 0 || i === uniqueRows.length - 1) {
        console.log(`Progress: ${i + 1}/${uniqueRows.length} participants imported`);
      }
    } catch (err) {
      console.error(`Failed to import "${row.fullName}":`, (err as Error).message);
    }
  }

  console.log(`\nDone! Created ${totalClients} client records with co-parent intake forms.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
