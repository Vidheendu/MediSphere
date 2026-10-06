#!/usr/bin/env node

/**
 * MediSphere Data Import CLI Tool
 *
 * Safely imports verified doctor and clinic records into Supabase.
 * - Enforces zero-mock data policies
 * - Validates required fields, canonical specialities, and clinic info
 * - Skips duplicates
 * - Preserves provenance source
 * - Enforces verification_status = "pending"
 *
 * Usage:
 *   npx tsx scripts/import-data.ts [optional-path-to-json]
 *   npm run import:data -- data/doctors/records.json
 */

import fs from "fs";
import path from "path";
import {
  validateDoctorRecord,
  importDoctorRecords,
  type RawDoctorRecord,
} from "../lib/services/import-service";

async function main() {
  console.log("==================================================");
  console.log("MEDISPHERE — VERIFIED DATA IMPORT TOOL");
  console.log("==================================================");

  const targetArg = process.argv[2];
  let targetPath = targetArg;

  if (!targetPath) {
    // Look in data/doctors for non-template json files
    const doctorsDir = path.resolve(process.cwd(), "data", "doctors");
    if (fs.existsSync(doctorsDir)) {
      const candidates = fs
        .readdirSync(doctorsDir)
        .filter(
          (file) =>
            file.endsWith(".json") &&
            !file.includes("template") &&
            !file.includes("schema")
        );

      if (candidates.length > 0) {
        targetPath = path.join(doctorsDir, candidates[0]);
        console.log(`Discovered candidate data file: ${targetPath}`);
      }
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    console.log("\n[INFO] No data file provided to import.");
    console.log("To import verified doctor records:");
    console.log("  1. Create a JSON file conforming to data/doctors/doctor.schema.json");
    console.log("  2. Run: npx tsx scripts/import-data.ts <path-to-your-file.json>");
    console.log("     or: npm run import:data -- <path-to-your-file.json>\n");
    console.log("IMPORTANT REMINDER:");
    console.log("  - Only import real, verified public healthcare information.");
    console.log("  - Never guess or fake missing fields (use null instead).");
    console.log("  - Every imported record will be queued with verification_status = 'pending'.\n");
    process.exit(0);
  }

  console.log(`\nReading records from: ${targetPath}`);
  const rawContent = fs.readFileSync(targetPath, "utf-8");
  let records: RawDoctorRecord[];

  try {
    const parsed = JSON.parse(rawContent);
    records = Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.error(`[ERROR] Failed to parse JSON in ${targetPath}:`, err);
    process.exit(1);
  }

  console.log(`Found ${records.length} record(s). Validating records...\n`);

  let validCount = 0;
  let invalidCount = 0;

  records.forEach((record, idx) => {
    const validation = validateDoctorRecord(record);
    if (validation.valid) {
      validCount++;
      console.log(`✓ [${idx + 1}/${records.length}] Valid: ${record.name} (${record.speciality})`);
    } else {
      invalidCount++;
      console.log(`✗ [${idx + 1}/${records.length}] Invalid: ${record.name || "Unnamed"}`);
      validation.errors.forEach((e) => console.log(`    - [${e.field}]: ${e.message}`));
    }
  });

  console.log(`\nValidation Summary: ${validCount} valid, ${invalidCount} invalid.`);

  if (invalidCount > 0) {
    console.error("\n[ABORT] Records failed schema validation. Please correct errors before importing.");
    process.exit(1);
  }

  // Check Supabase env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    console.warn("\n[NOTICE] NEXT_PUBLIC_SUPABASE_URL is not set in your environment.");
    console.warn("Records were successfully validated, but database insertion requires active Supabase credentials.");
    console.warn("Configure .env.local to proceed with live database import.");
    process.exit(0);
  }

  console.log("\nExecuting safe batch import into Supabase...");
  const summary = await importDoctorRecords(records);

  console.log("\n==================================================");
  console.log("IMPORT RESULTS");
  console.log("==================================================");
  console.log(`Total Records:        ${summary.total}`);
  console.log(`Successfully Imported: ${summary.imported} (queued as 'pending')`);
  console.log(`Skipped Duplicates:   ${summary.skippedDuplicates}`);
  console.log(`Failed Validation:    ${summary.failedValidation}`);

  if (summary.errors.length > 0) {
    console.log("\nIssues Encountered:");
    summary.errors.forEach((err) => {
      console.log(`  - ${err.identifier}: ${err.reason}`);
    });
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unhandled import script error:", err);
  process.exit(1);
});
