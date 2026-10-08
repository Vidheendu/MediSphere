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
import type {
  RawDoctorRecord,
  RawClinicRecord,
} from "../lib/services/import-service";

function loadEnvLocal() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function main() {
  loadEnvLocal();

  const {
    validateDoctorRecord,
    validateClinicRecord,
    importDoctorRecords,
    importClinicRecords,
  } = await import("../lib/services/import-service");

  console.log("==================================================");
  console.log("MEDISPHERE — VERIFIED DATA IMPORT TOOL");
  console.log("==================================================");

  const targetArg = process.argv[2];
  let targetPath = targetArg;

  if (!targetPath) {
    // Look in data/doctors or data/clinics for non-template json files
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
        console.log(`Discovered candidate doctor data file: ${targetPath}`);
      }
    }

    if (!targetPath) {
      const clinicsDir = path.resolve(process.cwd(), "data", "clinics");
      if (fs.existsSync(clinicsDir)) {
        const candidates = fs
          .readdirSync(clinicsDir)
          .filter(
            (file) =>
              file.endsWith(".json") &&
              !file.includes("template") &&
              !file.includes("schema")
          );

        if (candidates.length > 0) {
          targetPath = path.join(clinicsDir, candidates[0]);
          console.log(`Discovered candidate clinic data file: ${targetPath}`);
        }
      }
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    console.log("\n[INFO] No data file provided to import.");
    console.log("To import verified healthcare records:");
    console.log("  - Doctor records: npx tsx scripts/import-data.ts data/doctors/<file>.json");
    console.log("  - Clinic records: npx tsx scripts/import-data.ts data/clinics/<file>.json\n");
    console.log("IMPORTANT REMINDER:");
    console.log("  - Only import real, verified public healthcare information.");
    console.log("  - Never guess or fake missing fields (use null instead).");
    console.log("  - Every imported record will be queued with verification_status = 'pending'.\n");
    process.exit(0);
  }

  console.log(`\nReading records from: ${targetPath}`);
  const rawContent = fs.readFileSync(targetPath, "utf-8");
  let records: Array<Record<string, unknown>>;

  try {
    const parsed: unknown = JSON.parse(rawContent);
    records = Array.isArray(parsed)
      ? (parsed as Array<Record<string, unknown>>)
      : [parsed as Record<string, unknown>];
  } catch (err) {
    console.error(`[ERROR] Failed to parse JSON in ${targetPath}:`, err);
    process.exit(1);
  }

  const isClinic =
    targetPath.toLowerCase().includes("clinic") ||
    (records.length > 0 && !("speciality" in records[0]));

  const recordType = isClinic ? "Clinic" : "Doctor";
  console.log(`Found ${records.length} ${recordType} record(s). Validating records...\n`);

  let validCount = 0;
  let invalidCount = 0;

  records.forEach((record, idx) => {
    const validation = isClinic
      ? validateClinicRecord(record as unknown as RawClinicRecord)
      : validateDoctorRecord(record as unknown as RawDoctorRecord);

    if (validation.valid) {
      validCount++;
      const detail = isClinic
        ? `${String(record.name || "")} (${String(record.city || "Bhopal")})`
        : `${String(record.name || "")} (${String(record.speciality || "")})`;
      console.log(`✓ [${idx + 1}/${records.length}] Valid: ${detail}`);
    } else {
      invalidCount++;
      console.log(`✗ [${idx + 1}/${records.length}] Invalid: ${String(record.name || "Unnamed")}`);
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

  console.log(`\nExecuting safe batch import into Supabase (${recordType})...`);
  const summary = isClinic
    ? await importClinicRecords(records as unknown as RawClinicRecord[])
    : await importDoctorRecords(records as unknown as RawDoctorRecord[]);

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
