/**
 * Import master spreadsheet data into clients + enrollments.
 *
 * Usage:
 *   npx tsx scripts/importMaster.ts
 *
 * Source file: scripts/merged_output_2026-03-01.xlsx
 *   - 633 rows in one sheet ("Sheet1")
 *   - "Program" column: "Father Intake" (legal) or "Co-parenting Session" (coparent)
 *   - Both program types share the same column layout with different fields populated
 *
 * Behavior:
 *   - Splits rows by Program column and imports each to the correct program
 *   - Deduplicates by firstName + lastName (case-insensitive) against all existing clients
 *   - Creates client record + enrollment record for each new unique client
 *   - Running the script again skips already-imported clients (idempotent)
 *   - Batches Convex mutations in groups of 20 for safety
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

const FILE_NAME = "merged_output_2026-03-01.xlsx";

// ── Column mapping (shared across both program types) ────────────────────────

/** Master spreadsheet columns → normalized field names */
const COLUMN_MAP: Record<string, string> = {
  "Program":                    "program",
  "Full Name":                  "fullName",
  "DOB":                        "dateOfBirth",
  "Phone":                      "phone",
  "Email":                      "email",
  "Timestamp":                  "timestamp",
  "Role":                       "role",
  "Order Number":               "orderNumber",
  "Ethnicity":                  "ethnicity",
  "Zip":                        "zipCode",
  "Age":                        "age",
  "Co-Parent Name":             "coParentName",
  "Co-Parent Ethnicity":        "coParentEthnicity",
  "Co-Parent DOB":              "coParentDob",
  "Co-Parent Phone":            "coParentPhone",
  "Co-Parent Email":            "coParentEmail",
  "Co-Parent Zip":              "coParentZip",
  "Co-Parent Age":              "coParentAge",
  "Referral Source":            "referralSource",
  "Co-Parent Informed":         "coParentInformed",
  "Session Date":               "sessionDate",
  "Session Time":               "sessionTime",
  "Sessions Completed":         "sessionsCompleted",
  // Legal-specific columns
  "Reason for Visit":           "reasonForVisit",
  "Attorney Notes":             "attorneyNotes",
  "Has Attorney":               "hasAttorney",
  "Number of Visits":           "numberOfVisits",
  "Upcoming Court Date":        "upcomingCourtDate",
  "Restraining Orders":         "hasRestrainingOrder",
  "County Filed":               "countyFiledIn",
  "Family Court Orders":        "existingCourtOrders",
  "Custody Orders Followed":    "custodyOrderFollowed",
  "Orders Not Followed Reason": "notFollowedReason",
  "Minor Children":             "minorChildrenInvolved",
  "Children Residence":         "childrenResidence",
  "Previously Married":         "marriedToMother",
  "Child Support Orders":       "childSupportOrders",
  "Child Support Current":      "paymentStatus",
  "Seeking":                    "seekingTo",
  "Safety Concern":             "safetyFears",
  "Orders County":              "countyOfOrders",
};

interface MappedRow {
  program: string;
  fullName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  timestamp?: string;
  role?: string;
  ethnicity?: string;
  zipCode?: string;
  age?: string;
  referralSource?: string;
  // Coparent fields
  coParentName?: string;
  coParentEthnicity?: string;
  coParentDob?: string;
  coParentPhone?: string;
  coParentEmail?: string;
  coParentZip?: string;
  coParentAge?: string;
  coParentInformed?: string;
  sessionDate?: string;
  sessionTime?: string;
  sessionsCompleted?: string;
  // Legal fields
  reasonForVisit?: string;
  attorneyNotes?: string;
  hasAttorney?: string;
  numberOfVisits?: string;
  upcomingCourtDate?: string;
  hasRestrainingOrder?: string;
  countyFiledIn?: string;
  existingCourtOrders?: string;
  custodyOrderFollowed?: string;
  notFollowedReason?: string;
  minorChildrenInvolved?: string;
  childrenResidence?: string;
  marriedToMother?: string;
  childSupportOrders?: string;
  paymentStatus?: string;
  seekingTo?: string;
  safetyFears?: string;
  countyOfOrders?: string;
}

function mapRow(raw: Record<string, unknown>): MappedRow | null {
  const mapped: Record<string, string> = {};

  for (const [col, value] of Object.entries(raw)) {
    const field = COLUMN_MAP[col] || COLUMN_MAP[col.trim()];
    if (!field) continue;
    if (value !== undefined && value !== null && value !== "") {
      mapped[field] = String(value).trim();
    }
  }

  // fullName is required
  if (!mapped.fullName) return null;
  // program is required
  if (!mapped.program) return null;

  return mapped as unknown as MappedRow;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  // Collapse multiple spaces (some names have double spaces)
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/** Map program column value → programs table type */
function programType(programValue: string): "legal" | "coparent" | null {
  const lower = programValue.toLowerCase();
  if (lower.includes("father") || lower.includes("legal")) return "legal";
  if (lower.includes("co-parent") || lower.includes("coparent")) return "coparent";
  return null;
}

async function main() {
  const filePath = path.resolve(__dirname, FILE_NAME);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error(`Place the master spreadsheet at scripts/${FILE_NAME}`);
    process.exit(1);
  }

  // ── 1. Ensure programs exist ─────────────────────────────────────────────
  console.log("Ensuring programs are seeded...");
  const programIds = await client.mutation(api.programs.ensureSeeded, {});
  console.log("Program IDs:", programIds);

  // ── 2. Read and parse xlsx ───────────────────────────────────────────────
  console.log(`\nReading ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  console.log(`Found ${rawRows.length} rows in sheet "${sheetName}"`);

  // ── 3. Map and filter valid rows ─────────────────────────────────────────
  const allRows: MappedRow[] = [];
  let noName = 0;
  let unknownProgram = 0;

  for (const raw of rawRows) {
    const mapped = mapRow(raw);
    if (!mapped) { noName++; continue; }
    const pType = programType(mapped.program);
    if (!pType) { unknownProgram++; continue; }
    allRows.push(mapped);
  }

  console.log(`Valid rows: ${allRows.length} (skipped ${noName} no-name, ${unknownProgram} unknown program)`);

  // ── 4. Deduplicate by fullName within file ────────────────────────────────
  const deduped = new Map<string, MappedRow>();
  for (const row of allRows) {
    const key = row.fullName.toLowerCase().replace(/\s+/g, " ").trim();
    // Keep last occurrence (most recent timestamp)
    deduped.set(key, row);
  }
  const uniqueRows = Array.from(deduped.values());
  console.log(`Unique names in file: ${uniqueRows.length} (deduped ${allRows.length - uniqueRows.length} duplicates)`);

  // ── 5. Split by program type ──────────────────────────────────────────────
  const legalRows = uniqueRows.filter(r => programType(r.program) === "legal");
  const coparentRows = uniqueRows.filter(r => programType(r.program) === "coparent");
  console.log(`  Legal (Father Intake): ${legalRows.length}`);
  console.log(`  Coparent (Co-parenting Session): ${coparentRows.length}`);

  // ── 6. Import legal clients in batches ───────────────────────────────────
  console.log("\n--- Importing legal clients ---");
  const legalProgramId = programIds["legal"];
  if (!legalProgramId) {
    console.error("No legal program found. Check programs.ensureSeeded.");
    process.exit(1);
  }

  const BATCH_SIZE = 20;
  let legalCreated = 0;
  let legalSkipped = 0;

  const legalBatchRows = legalRows.map(row => {
    const { firstName, lastName } = parseName(row.fullName);
    return {
      firstName,
      lastName,
      zipCode: row.zipCode || undefined,
      ethnicity: row.ethnicity || undefined,
      age: row.age || undefined,
      coParentName: row.coParentName || undefined,
      reasonForVisit: row.reasonForVisit || undefined,
      attorneyNotes: row.attorneyNotes || undefined,
      hasAttorney: row.hasAttorney || undefined,
      email: row.email || undefined,
      numberOfVisits: row.numberOfVisits || undefined,
      upcomingCourtDate: row.upcomingCourtDate || undefined,
      hasRestrainingOrder: row.hasRestrainingOrder || undefined,
      countyFiledIn: row.countyFiledIn || undefined,
      existingCourtOrders: row.existingCourtOrders || undefined,
      custodyOrderFollowed: row.custodyOrderFollowed || undefined,
      notFollowedReason: row.notFollowedReason || undefined,
      minorChildrenInvolved: row.minorChildrenInvolved || undefined,
      childrenResidence: row.childrenResidence || undefined,
      marriedToMother: row.marriedToMother || undefined,
      childSupportOrders: row.childSupportOrders || undefined,
      paymentStatus: row.paymentStatus || undefined,
      seekingTo: row.seekingTo || undefined,
      safetyFears: row.safetyFears || undefined,
      dateOfBirth: row.dateOfBirth || undefined,
      countyOfOrders: row.countyOfOrders || undefined,
      referralSource: row.referralSource || undefined,
    };
  });

  for (let i = 0; i < legalBatchRows.length; i += BATCH_SIZE) {
    const batch = legalBatchRows.slice(i, i + BATCH_SIZE);
    const result = await client.mutation(api.clients.importLegalBatch, { rows: batch });
    legalCreated += result.created;
    legalSkipped += result.skipped;
    console.log(
      `  Legal batch ${Math.floor(i / BATCH_SIZE) + 1}: +${result.created} created, ${result.skipped} skipped`
    );
  }

  console.log(`Legal import complete: ${legalCreated} created, ${legalSkipped} skipped`);

  // ── 7. Now create enrollments for newly created legal clients ─────────────
  // Re-fetch all clients to find the ones we just created (by name match)
  // The batch mutation creates both client + legalIntakeForm but NOT the enrollment.
  // We need to create enrollments linking them to the legal program.
  console.log("\n--- Creating legal enrollments ---");

  // Re-fetch all clients after legal import
  const allClientsAfterLegal = await client.query(api.clients.list, {});

  // Find clients that don't yet have any enrollment (the freshly imported ones)
  // We do this by checking which names from our legal rows exist and creating enrollments
  const legalNameSet = new Set(
    legalBatchRows.map(r => `${r.firstName.toLowerCase()}|${r.lastName.toLowerCase()}`)
  );

  const newLegalClients = allClientsAfterLegal.filter(
    c => legalNameSet.has(`${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`)
  );

  // Batch enroll — check existing enrollments to avoid duplicates
  let enrollmentsCreated = 0;
  let enrollmentsSkipped = 0;

  const legalEnrollBatch = newLegalClients.map(c => ({
    clientId: c._id,
    programId: legalProgramId as string,
  }));

  for (let i = 0; i < legalEnrollBatch.length; i += BATCH_SIZE) {
    const batch = legalEnrollBatch.slice(i, i + BATCH_SIZE);
    const result = await client.mutation(api.enrollments.importEnrollmentBatch, { rows: batch });
    enrollmentsCreated += result.created;
    enrollmentsSkipped += result.skipped;
    if ((i / BATCH_SIZE + 1) % 5 === 0 || i + BATCH_SIZE >= legalEnrollBatch.length) {
      console.log(
        `  Enrollment batch ${Math.floor(i / BATCH_SIZE) + 1}: +${result.created} created, ${result.skipped} skipped`
      );
    }
  }
  console.log(`Legal enrollments: ${enrollmentsCreated} created, ${enrollmentsSkipped} skipped`);

  // ── 8. Import coparent clients in batches ────────────────────────────────
  console.log("\n--- Importing coparent clients ---");
  const coparentProgramId = programIds["coparent"];
  if (!coparentProgramId) {
    console.error("No coparent program found. Check programs.ensureSeeded.");
    process.exit(1);
  }

  let coparentCreated = 0;
  let coparentSkipped = 0;

  const coparentBatchRows = coparentRows.map(row => {
    const { firstName, lastName } = parseName(row.fullName);
    return {
      firstName,
      lastName,
      fullName: row.fullName,
      zipCode: row.zipCode || undefined,
      ethnicity: row.ethnicity || undefined,
      age: row.age || undefined,
      timestamp: row.timestamp || undefined,
      role: row.role || undefined,
      dateOfBirth: row.dateOfBirth || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      coParentName: row.coParentName || undefined,
      coParentEthnicity: row.coParentEthnicity || undefined,
      coParentDob: row.coParentDob || undefined,
      coParentPhone: row.coParentPhone || undefined,
      coParentEmail: row.coParentEmail || undefined,
      coParentZip: row.coParentZip || undefined,
      coParentAge: row.coParentAge || undefined,
      referralSource: row.referralSource || undefined,
      coParentInformed: row.coParentInformed || undefined,
      sessionDate: row.sessionDate || undefined,
      sessionTime: row.sessionTime || undefined,
      sessionsCompleted: row.sessionsCompleted || undefined,
    };
  });

  for (let i = 0; i < coparentBatchRows.length; i += BATCH_SIZE) {
    const batch = coparentBatchRows.slice(i, i + BATCH_SIZE);
    const result = await client.mutation(api.clients.importCoparentBatch, { rows: batch });
    coparentCreated += result.created;
    coparentSkipped += result.skipped;
    console.log(
      `  Coparent batch ${Math.floor(i / BATCH_SIZE) + 1}: +${result.created} created, ${result.skipped} skipped`
    );
  }

  console.log(`Coparent import complete: ${coparentCreated} created, ${coparentSkipped} skipped`);

  // ── 9. Create coparent enrollments ───────────────────────────────────────
  console.log("\n--- Creating coparent enrollments ---");

  const allClientsAfterCoparent = await client.query(api.clients.list, {});

  const coparentNameSet = new Set(
    coparentBatchRows.map(r => `${r.firstName.toLowerCase()}|${r.lastName.toLowerCase()}`)
  );

  const newCoparentClients = allClientsAfterCoparent.filter(
    c => coparentNameSet.has(`${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`)
  );

  let coparentEnrollCreated = 0;
  let coparentEnrollSkipped = 0;

  const coparentEnrollBatch = newCoparentClients.map(c => ({
    clientId: c._id,
    programId: coparentProgramId as string,
  }));

  for (let i = 0; i < coparentEnrollBatch.length; i += BATCH_SIZE) {
    const batch = coparentEnrollBatch.slice(i, i + BATCH_SIZE);
    const result = await client.mutation(api.enrollments.importEnrollmentBatch, { rows: batch });
    coparentEnrollCreated += result.created;
    coparentEnrollSkipped += result.skipped;
    console.log(
      `  Coparent enroll batch ${Math.floor(i / BATCH_SIZE) + 1}: +${result.created} created, ${result.skipped} skipped`
    );
  }

  console.log(`Coparent enrollments: ${coparentEnrollCreated} created, ${coparentEnrollSkipped} skipped`);

  // ── 10. Summary ───────────────────────────────────────────────────────────
  const finalClients = await client.query(api.clients.list, {});
  console.log("\n=== IMPORT COMPLETE ===");
  console.log(`Total rows in file:    ${rawRows.length}`);
  console.log(`Unique names imported: ${uniqueRows.length}`);
  console.log(`  Legal created:       ${legalCreated}`);
  console.log(`  Legal skipped:       ${legalSkipped}`);
  console.log(`  Coparent created:    ${coparentCreated}`);
  console.log(`  Coparent skipped:    ${coparentSkipped}`);
  console.log(`Legal enrollments:     +${enrollmentsCreated} (${enrollmentsSkipped} skipped)`);
  console.log(`Coparent enrollments:  +${coparentEnrollCreated} (${coparentEnrollSkipped} skipped)`);
  console.log(`\nTotal clients in DB:   ${finalClients.length}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
