/**
 * Unified client seed script.
 *
 * Reads both Excel files, ensures programs exist, deduplicates by name,
 * and imports all clients into the unified clients table with linked intake forms.
 *
 * Usage:
 *   npx tsx scripts/seedClients.ts
 *
 * Expects:
 *   - Legal intake:    /Users/mastermac/Downloads/Father Intake Form 2024 w attorney notes USE.xlsx
 *   - Co-parent intake: /Users/mastermac/Downloads/Co-parenting Sessions  sign in.xlsx
 */

import * as XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
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

const LEGAL_FILE = "/Users/mastermac/Downloads/Father Intake Form 2024 w attorney notes USE.xlsx";
const COPARENT_FILE = "/Users/mastermac/Downloads/Co-parenting Sessions  sign in.xlsx";

const BATCH_SIZE = 20;

// ── Legal intake column mapping ──────────────────────────────────────

const LEGAL_COLUMN_MAP: Record<string, string> = {
  "FIRST NAME (as it appears on I.D)": "firstName",
  "LAST NAME (as it appears on I.D)": "lastName",
  "Name of Co-parent": "coParentName",
  "Reason for visit. ": "reasonForVisit",
  "Reason for visit.": "reasonForVisit",
  "Attorney notes": "attorneyNotes",
  "Are you currently represented by an attorney?": "hasAttorney",
  "Email Address": "email",
  "Number of visits ": "numberOfVisits",
  "Number of visits": "numberOfVisits",
  "Do you have an upcoming court date?  If so, give date and location?": "upcomingCourtDate",
  "Are there any restraining orders currently in place against you?": "hasRestrainingOrder",
  "County filed in.": "countyFiledIn",
  "County filed in": "countyFiledIn",
  "Do you have any existing family court orders? If so indicate which kind (check all that apply and indicate county)": "existingCourtOrders",
  "If there is Child Custody order in place are the orders being followed ": "custodyOrderFollowed",
  "If there is Child Custody order in place are the orders being followed": "custodyOrderFollowed",
  "If not being followed, why?": "notFollowedReason",
  "Are there minor children involved/ emancipated? ": "minorChildrenInvolved",
  "Are there minor children involved/ emancipated?": "minorChildrenInvolved",
  "If so, where do they reside (City, State) number of children involved.": "childrenResidence",
  "Have you and the child's mother ever been married?": "marriedToMother",
  "Are there current Child Support orders in place? ": "childSupportOrders",
  "Are there current Child Support orders in place?": "childSupportOrders",
  "If so, are you up to date with payments? Explain.": "paymentStatus",
  "Are you seeking to:": "seekingTo",
  "Do you fear for your safety or the child's safety?": "safetyFears",
  "Date of Birth (MM/DD/YYYY)": "dateOfBirth",
  "Which County are your orders in?": "countyOfOrders",
  "How did you find out about the program?": "referralSource",
  "ethnicity": "ethnicity",
  "What is your Zip code": "zipCode",
  "Age": "age",
};

// ── Co-parent intake column mappings ─────────────────────────────────

// "Use this sheet" and "End 24 Jan 25" share the same column layout
const COPARENT_STANDARD_MAP: Record<string, string> = {
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
const COPARENT_OLD_MAP: Record<string, string> = {
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

const COPARENT_SHEETS = ["Use this sheet", "End 24 Jan 25", "Old list"];

// ── Helpers ──────────────────────────────────────────────────────────

function mapRow(raw: Record<string, unknown>, columnMap: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [col, value] of Object.entries(raw)) {
    const field = columnMap[col] || columnMap[col.trim()];
    if (!field) continue;
    if (value !== undefined && value !== null && value !== "") {
      mapped[field] = String(value).trim();
    }
  }
  return mapped;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function str(val: unknown): string | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  return String(val).trim() || undefined;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  // Verify files exist
  for (const f of [LEGAL_FILE, COPARENT_FILE]) {
    if (!fs.existsSync(f)) {
      console.error(`File not found: ${f}`);
      process.exit(1);
    }
  }

  // 1. Ensure programs exist
  console.log("Ensuring programs are seeded...");
  const programIds = await client.mutation(api.programs.ensureSeeded, {});
  const legalProgramId = programIds.legal as Id<"programs">;
  const coparentProgramId = programIds.coparent as Id<"programs">;
  console.log(`  Legal program:    ${legalProgramId}`);
  console.log(`  Co-Parent program: ${coparentProgramId}`);

  // 2. Parse legal intake Excel
  console.log(`\nReading legal intake: ${LEGAL_FILE}`);
  const legalWb = XLSX.readFile(LEGAL_FILE);
  const legalSheet = legalWb.Sheets[legalWb.SheetNames[0]];
  const legalRawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(legalSheet);
  console.log(`  Raw rows: ${legalRawRows.length}`);

  // Map and deduplicate legal rows by firstName+lastName (keep last occurrence)
  const legalDeduped = new Map<string, Record<string, string>>();
  for (const raw of legalRawRows) {
    const mapped = mapRow(raw, LEGAL_COLUMN_MAP);
    if (!mapped.firstName || !mapped.lastName) continue;
    const key = `${mapped.firstName.toLowerCase()}|${mapped.lastName.toLowerCase()}`;
    legalDeduped.set(key, mapped);
  }

  const legalRows = Array.from(legalDeduped.values());
  console.log(`  Unique clients after dedup: ${legalRows.length}`);

  // 3. Parse co-parent intake Excel (all sheets)
  console.log(`\nReading co-parent intake: ${COPARENT_FILE}`);
  const coparentWb = XLSX.readFile(COPARENT_FILE);
  const coparentAllRows: Record<string, string>[] = [];

  for (const sheetName of coparentWb.SheetNames) {
    if (!COPARENT_SHEETS.includes(sheetName)) {
      console.log(`  Skipping sheet "${sheetName}"`);
      continue;
    }

    const sheet = coparentWb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const isOldList = sheetName === "Old list";
    const columnMap = isOldList ? COPARENT_OLD_MAP : COPARENT_STANDARD_MAP;

    let count = 0;
    for (const raw of rawRows) {
      const mapped = mapRow(raw, columnMap);
      if (isOldList && !mapped.role) mapped.role = "Dad";
      if (!mapped.fullName) continue;
      coparentAllRows.push(mapped);
      count++;
    }
    console.log(`  Sheet "${sheetName}": ${rawRows.length} raw → ${count} with names`);
  }

  // Deduplicate co-parent rows by fullName (keep last occurrence)
  const coparentDeduped = new Map<string, Record<string, string>>();
  for (const row of coparentAllRows) {
    const key = (row.fullName || "").toLowerCase().trim();
    if (key) coparentDeduped.set(key, row);
  }

  const coparentRows = Array.from(coparentDeduped.values());
  console.log(`  Unique participants after dedup: ${coparentRows.length}`);

  // 4. Import legal clients in batches
  console.log(`\nImporting ${legalRows.length} legal clients...`);
  let legalCreated = 0;
  let legalSkipped = 0;

  for (let i = 0; i < legalRows.length; i += BATCH_SIZE) {
    const batch = legalRows.slice(i, i + BATCH_SIZE).map((row) => ({
      firstName: row.firstName!,
      lastName: row.lastName!,
      zipCode: str(row.zipCode),
      ethnicity: str(row.ethnicity),
      age: str(row.age),
      coParentName: str(row.coParentName),
      reasonForVisit: str(row.reasonForVisit),
      attorneyNotes: str(row.attorneyNotes),
      hasAttorney: str(row.hasAttorney),
      email: str(row.email),
      numberOfVisits: str(row.numberOfVisits),
      upcomingCourtDate: str(row.upcomingCourtDate),
      hasRestrainingOrder: str(row.hasRestrainingOrder),
      countyFiledIn: str(row.countyFiledIn),
      existingCourtOrders: str(row.existingCourtOrders),
      custodyOrderFollowed: str(row.custodyOrderFollowed),
      notFollowedReason: str(row.notFollowedReason),
      minorChildrenInvolved: str(row.minorChildrenInvolved),
      childrenResidence: str(row.childrenResidence),
      marriedToMother: str(row.marriedToMother),
      childSupportOrders: str(row.childSupportOrders),
      paymentStatus: str(row.paymentStatus),
      seekingTo: str(row.seekingTo),
      safetyFears: str(row.safetyFears),
      dateOfBirth: str(row.dateOfBirth),
      countyOfOrders: str(row.countyOfOrders),
      referralSource: str(row.referralSource),
    }));

    const result = await client.mutation(api.clients.importLegalBatch, {
      programId: legalProgramId,
      rows: batch,
    });
    legalCreated += result.created;
    legalSkipped += result.skipped;

    if ((i + BATCH_SIZE) % 100 < BATCH_SIZE || i + BATCH_SIZE >= legalRows.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, legalRows.length)}/${legalRows.length} (created: ${legalCreated}, skipped: ${legalSkipped})`);
    }
  }

  console.log(`  Legal done: ${legalCreated} created, ${legalSkipped} skipped`);

  // 5. Import co-parent clients in batches
  console.log(`\nImporting ${coparentRows.length} co-parent clients...`);
  let coparentCreated = 0;
  let coparentSkipped = 0;

  for (let i = 0; i < coparentRows.length; i += BATCH_SIZE) {
    const batch = coparentRows.slice(i, i + BATCH_SIZE).map((row) => {
      const { firstName, lastName } = parseName(row.fullName || "Unknown");
      return {
        firstName,
        lastName,
        fullName: str(row.fullName),
        zipCode: str(row.zipCode),
        ethnicity: str(row.ethnicity),
        age: str(row.age),
        timestamp: str(row.timestamp),
        role: str(row.role),
        dateOfBirth: str(row.dateOfBirth),
        phone: str(row.phone),
        email: str(row.email),
        coParentName: str(row.coParentName),
        coParentEthnicity: str(row.coParentEthnicity),
        coParentDob: str(row.coParentDob),
        coParentPhone: str(row.coParentPhone),
        coParentEmail: str(row.coParentEmail),
        coParentZip: str(row.coParentZip),
        coParentAge: str(row.coParentAge),
        referralSource: str(row.referralSource),
        coParentInformed: str(row.coParentInformed),
        sessionDate: str(row.sessionDate),
        sessionTime: str(row.sessionTime),
        sessionsCompleted: str(row.sessionsCompleted),
      };
    });

    const result = await client.mutation(api.clients.importCoparentBatch, {
      programId: coparentProgramId,
      rows: batch,
    });
    coparentCreated += result.created;
    coparentSkipped += result.skipped;

    if ((i + BATCH_SIZE) % 100 < BATCH_SIZE || i + BATCH_SIZE >= coparentRows.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, coparentRows.length)}/${coparentRows.length} (created: ${coparentCreated}, skipped: ${coparentSkipped})`);
    }
  }

  console.log(`  Co-parent done: ${coparentCreated} created, ${coparentSkipped} skipped`);

  // Summary
  console.log(`\n========== SEED COMPLETE ==========`);
  console.log(`Legal clients:     ${legalCreated} created, ${legalSkipped} dupes skipped`);
  console.log(`Co-parent clients: ${coparentCreated} created, ${coparentSkipped} dupes skipped`);
  console.log(`Total clients:     ${legalCreated + coparentCreated}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
