/**
 * One-time import script for legal intake forms from Excel.
 *
 * Usage:
 *   1. Place the Excel file at scripts/intake-data.xlsx
 *   2. npm install xlsx (if not already installed)
 *   3. npx tsx scripts/importIntake.ts
 *
 * The script reads the spreadsheet, maps columns to legalIntakeForms fields,
 * and calls the Convex importFromData mutation in batches of 50.
 *
 * Requires CONVEX_URL env var (or reads from .env.local).
 */

import * as XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Column name → field name mapping (adjust to match your spreadsheet headers)
const COLUMN_MAP: Record<string, string> = {
  "Intake Date": "intakeDate",
  "First Name": "firstName",
  "Last Name": "lastName",
  "Co-Parent Name": "coParentName",
  "Co-Parent's Name": "coParentName",
  "Reason for Visit": "reasonForVisit",
  "Attorney Notes": "attorneyNotes",
  "Has Attorney": "hasAttorney",
  "Do you have an attorney?": "hasAttorney",
  "Email": "email",
  "Email Address": "email",
  "Number of Visits": "numberOfVisits",
  "# of Visits": "numberOfVisits",
  "Upcoming Court Date": "upcomingCourtDate",
  "Has Restraining Order": "hasRestrainingOrder",
  "Restraining Order": "hasRestrainingOrder",
  "County Filed In": "countyFiledIn",
  "County": "countyFiledIn",
  "Existing Court Orders": "existingCourtOrders",
  "Custody Order Followed": "custodyOrderFollowed",
  "Is the custody order being followed?": "custodyOrderFollowed",
  "Not Followed Reason": "notFollowedReason",
  "If not, why?": "notFollowedReason",
  "Minor Children Involved": "minorChildrenInvolved",
  "Children Residence": "childrenResidence",
  "Where do the children reside?": "childrenResidence",
  "Married to Mother": "marriedToMother",
  "Are you married to the mother?": "marriedToMother",
  "Child Support Orders": "childSupportOrders",
  "Payment Status": "paymentStatus",
  "Seeking To": "seekingTo",
  "What are you seeking?": "seekingTo",
  "Safety Fears": "safetyFears",
  "Date of Birth": "dateOfBirth",
  "DOB": "dateOfBirth",
  "County of Orders": "countyOfOrders",
  "Referral Source": "referralSource",
  "How did you hear about us?": "referralSource",
  "Ethnicity": "ethnicity",
  "Race/Ethnicity": "ethnicity",
  "Zip Code": "zipCode",
  "Zip": "zipCode",
  "Age": "age",
};

function mapRow(row: Record<string, unknown>): Record<string, string | undefined> {
  const mapped: Record<string, string | undefined> = {};

  for (const [col, value] of Object.entries(row)) {
    const fieldName = COLUMN_MAP[col] || COLUMN_MAP[col.trim()];
    if (!fieldName) continue;

    // Skip the intakeDate field here — handle it specially
    if (fieldName === "intakeDate") continue;

    if (value !== undefined && value !== null && value !== "") {
      mapped[fieldName] = String(value).trim();
    }
  }

  return mapped;
}

async function main() {
  const filePath = path.resolve(__dirname, "intake-data.xlsx");

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error("Place your Excel file at scripts/intake-data.xlsx");
    process.exit(1);
  }

  console.log(`Reading ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  console.log(`Found ${rawRows.length} rows in sheet "${sheetName}"`);

  const rows = rawRows.map(mapRow);

  // Import in batches of 50
  const BATCH_SIZE = 50;
  let total = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await client.mutation(api.legalIntake.importFromData, {
      rows: batch,
    });
    total += result.imported;
    console.log(`Imported batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.imported} rows (total: ${total})`);
  }

  console.log(`\nDone! Imported ${total} intake forms.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
