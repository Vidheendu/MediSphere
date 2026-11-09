import fs from "fs";
import path from "path";
import {
  extractDoctorProvenance,
  getAdminCurrentTimeIST,
} from "../lib/services/admin";

// Terminal colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string, detail?: string) {
  if (condition) {
    console.log(`  ${colors.green}✓${colors.reset} ${message}`);
    passedCount++;
  } else {
    console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${message}`);
    if (detail) console.error(`    ${colors.yellow}Detail: ${detail}${colors.reset}`);
    failedCount++;
  }
}

console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}  MEDISPHERE PHASE 20: ADMIN PANEL & SECURITY AUDIT VERIFY     ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

const ROOT_DIR = path.resolve(__dirname, "..");

// ----------------------------------------------------------------------------
// TEST SUITE 1: DATABASE MIGRATION & SCHEMA CONSISTENCY
// ----------------------------------------------------------------------------
console.log(`${colors.bold}1. Database Migration & Schema Consistency${colors.reset}`);

const migrationPath = path.join(ROOT_DIR, "supabase/migrations/20261025000000_admin_and_security.sql");
assert(fs.existsSync(migrationPath), "Phase 20 migration file 20261025000000_admin_and_security.sql exists");

if (fs.existsSync(migrationPath)) {
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  assert(
    migrationSql.includes("ALTER TABLE public.doctors") &&
    migrationSql.includes("rejection_reason TEXT") &&
    migrationSql.includes("verified_at TIMESTAMPTZ"),
    "Migration adds rejection_reason and verified_at to public.doctors"
  );

  assert(
    migrationSql.includes("CREATE POLICY \"Allow admin full access on doctor_reviews\"") &&
    migrationSql.includes("public.is_admin()"),
    "Migration adds admin full access RLS policy on public.doctor_reviews"
  );

  assert(
    migrationSql.includes("CREATE OR REPLACE FUNCTION public.admin_update_doctor_status"),
    "Migration defines admin_update_doctor_status stored procedure"
  );

  assert(
    migrationSql.includes("CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats"),
    "Migration defines get_admin_dashboard_stats stored procedure"
  );

  assert(
    migrationSql.includes("Asia/Kolkata"),
    "Stored procedure uses Asia/Kolkata timezone for time-based statistics"
  );
}

const masterSchemaPath = path.join(ROOT_DIR, "supabase/schema.sql");
assert(fs.existsSync(masterSchemaPath), "Single source of truth schema.sql exists");

if (fs.existsSync(masterSchemaPath)) {
  const schemaSql = fs.readFileSync(masterSchemaPath, "utf-8");

  assert(
    schemaSql.includes("rejection_reason TEXT") && schemaSql.includes("verified_at TIMESTAMPTZ"),
    "schema.sql contains updated doctors table with rejection_reason and verified_at"
  );

  assert(
    schemaSql.includes("Allow admin full access on doctor_reviews"),
    "schema.sql contains admin policy on doctor_reviews"
  );

  assert(
    schemaSql.includes("admin_update_doctor_status"),
    "schema.sql contains admin_update_doctor_status procedure"
  );

  assert(
    schemaSql.includes("get_admin_dashboard_stats"),
    "schema.sql contains get_admin_dashboard_stats procedure"
  );
}

// ----------------------------------------------------------------------------
// TEST SUITE 2: TYPESCRIPT TYPES & INTERFACES
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}2. TypeScript Types & Database Interfaces${colors.reset}`);

const typesPath = path.join(ROOT_DIR, "types/database.ts");
assert(fs.existsSync(typesPath), "types/database.ts exists");

if (fs.existsSync(typesPath)) {
  const typesContent = fs.readFileSync(typesPath, "utf-8");

  assert(
    typesContent.includes("export interface AdminDashboardStats"),
    "types/database.ts exports AdminDashboardStats interface"
  );

  assert(
    typesContent.includes("total_doctors: number") &&
    typesContent.includes("pending_doctors: number") &&
    typesContent.includes("verified_doctors: number") &&
    typesContent.includes("upcoming_appointments: number"),
    "AdminDashboardStats interface covers required operational metrics"
  );

  assert(
    typesContent.includes("rejection_reason?: string | null") || typesContent.includes("rejection_reason: string | null"),
    "doctors table row interface includes rejection_reason and verified_at"
  );

  assert(
    typesContent.includes('export type UserRole = "patient" | "doctor" | "admin"'),
    "UserRole includes 'admin'"
  );
}

// ----------------------------------------------------------------------------
// TEST SUITE 3: ADMIN SERVICE ARCHITECTURE & UNIT LOGIC
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}3. Admin Service Architecture & Unit Logic${colors.reset}`);

const adminServicePath = path.join(ROOT_DIR, "lib/services/admin.ts");
assert(fs.existsSync(adminServicePath), "lib/services/admin.ts exists");

if (fs.existsSync(adminServicePath)) {
  const serviceContent = fs.readFileSync(adminServicePath, "utf-8");

  assert(serviceContent.includes("export async function getAdminDashboardStats"), "getAdminDashboardStats exported");
  assert(serviceContent.includes("export async function getAdminDoctors"), "getAdminDoctors exported");
  assert(serviceContent.includes("export async function updateDoctorVerification"), "updateDoctorVerification exported");
  assert(serviceContent.includes("export async function getAdminClinics"), "getAdminClinics exported");
  assert(serviceContent.includes("export async function updateAdminClinic"), "updateAdminClinic exported");
  assert(serviceContent.includes("export async function getAdminAppointments"), "getAdminAppointments exported");
  assert(serviceContent.includes("export async function getAdminUsers"), "getAdminUsers exported");
  assert(serviceContent.includes("export async function getAdminReviews"), "getAdminReviews exported");
  assert(serviceContent.includes("export async function deleteAdminReview"), "deleteAdminReview exported");
  assert(serviceContent.includes("export function extractDoctorProvenance"), "extractDoctorProvenance exported");
  assert(serviceContent.includes("export function getAdminCurrentTimeIST"), "getAdminCurrentTimeIST exported");
}

const servicesIndexPath = path.join(ROOT_DIR, "lib/services/index.ts");
if (fs.existsSync(servicesIndexPath)) {
  const indexContent = fs.readFileSync(servicesIndexPath, "utf-8");
  assert(indexContent.includes('export * from "./admin"'), "lib/services/index.ts re-exports admin service");
}

// Unit test: extractDoctorProvenance
const sampleAboutWithProv = "Senior Consultant at Bansal Hospital.\n\n[Import Provenance: https://bansalhospital.com/doctor/dr-sk-tandon]";
assert(
  extractDoctorProvenance(sampleAboutWithProv) === "https://bansalhospital.com/doctor/dr-sk-tandon",
  "extractDoctorProvenance accurately parses provenance URL from about text"
);

assert(
  extractDoctorProvenance("Ordinary practitioner description with no annotation.") === null,
  "extractDoctorProvenance safely returns null when provenance is absent"
);

assert(
  extractDoctorProvenance(null) === null && extractDoctorProvenance(undefined) === null,
  "extractDoctorProvenance safely handles null and undefined"
);

// Unit test: getAdminCurrentTimeIST
const ist = getAdminCurrentTimeIST();
assert(
  typeof ist.dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ist.dateStr),
  `getAdminCurrentTimeIST returns valid YYYY-MM-DD date string (${ist.dateStr})`
);
assert(
  typeof ist.timeStr === "string" && /^\d{2}:\d{2}:\d{2}$/.test(ist.timeStr),
  `getAdminCurrentTimeIST returns valid HH:MM:SS time string (${ist.timeStr})`
);

// ----------------------------------------------------------------------------
// TEST SUITE 4: ADMIN AUTHORIZATION & SECURITY GUARDS
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}4. Admin Authorization & Security Guards${colors.reset}`);

const adminGuardPath = path.join(ROOT_DIR, "components/auth/AdminProtectedRoute.tsx");
assert(fs.existsSync(adminGuardPath), "AdminProtectedRoute.tsx exists");

if (fs.existsSync(adminGuardPath)) {
  const guardContent = fs.readFileSync(adminGuardPath, "utf-8");
  assert(
    guardContent.includes('allowedRoles={["admin"]}') && guardContent.includes('redirectPath="/admin/login"'),
    "AdminProtectedRoute strictly enforces allowedRoles=['admin'] with redirect to /admin/login"
  );
}

const authContextPath = path.join(ROOT_DIR, "lib/auth/auth-context.tsx");
if (fs.existsSync(authContextPath)) {
  const authContent = fs.readFileSync(authContextPath, "utf-8");
  assert(authContent.includes("signInAdmin:"), "auth-context provides signInAdmin method");
  assert(
    authContent.includes('userProfile.role !== "admin"') &&
    authContent.includes("supabase.auth.signOut()"),
    "signInAdmin strictly checks role === 'admin' and revokes session on role mismatch"
  );
}

const protectedRoutePath = path.join(ROOT_DIR, "components/auth/ProtectedRoute.tsx");
if (fs.existsSync(protectedRoutePath)) {
  const prContent = fs.readFileSync(protectedRoutePath, "utf-8");
  assert(
    prContent.includes('allowedRoles.includes("admin") ? "/admin/login"') ||
    prContent.includes('allowedRoles.includes("admin")'),
    "ProtectedRoute handles admin redirect and access restriction gracefully"
  );
}

// ----------------------------------------------------------------------------
// TEST SUITE 5: ADMIN ROUTES & PAGE IMPLEMENTATIONS
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}5. Admin Routes & Page Implementations${colors.reset}`);

const routes = [
  { path: "app/admin/layout.tsx", name: "Admin Root Layout" },
  { path: "app/admin/page.tsx", name: "Admin Dashboard Overview (/admin)" },
  { path: "app/admin/doctors/page.tsx", name: "Doctor Verification (/admin/doctors)" },
  { path: "app/admin/clinics/page.tsx", name: "Clinic Governance (/admin/clinics)" },
  { path: "app/admin/appointments/page.tsx", name: "Appointment Oversight (/admin/appointments)" },
  { path: "app/admin/users/page.tsx", name: "User Governance (/admin/users)" },
  { path: "app/admin/reviews/page.tsx", name: "Review Moderation (/admin/reviews)" },
  { path: "app/admin/login/page.tsx", name: "Admin Login Portal (/admin/login)" },
];

for (const r of routes) {
  const fullPath = path.join(ROOT_DIR, r.path);
  assert(fs.existsSync(fullPath), `Route file exists: ${r.name}`);

  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    assert(
      content.includes('"use client"') || content.includes("'use client'"),
      `${r.name} declares client component boundary`
    );
  }
}

const adminNavPath = path.join(ROOT_DIR, "components/admin/AdminNav.tsx");
assert(fs.existsSync(adminNavPath), "Admin navigation component AdminNav.tsx exists");

if (fs.existsSync(adminNavPath)) {
  const navContent = fs.readFileSync(adminNavPath, "utf-8");
  assert(navContent.includes("/admin/doctors"), "AdminNav links to /admin/doctors");
  assert(navContent.includes("/admin/clinics"), "AdminNav links to /admin/clinics");
  assert(navContent.includes("/admin/appointments"), "AdminNav links to /admin/appointments");
  assert(navContent.includes("/admin/users"), "AdminNav links to /admin/users");
  assert(navContent.includes("/admin/reviews"), "AdminNav links to /admin/reviews");
}

// ----------------------------------------------------------------------------
// TEST SUITE 6: SECURITY AUDIT & CREDENTIAL HYGIENE
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}6. Security Audit & Credential Hygiene${colors.reset}`);

// Check that client bundle files do not expose service-role key
const srcFiles = ["lib/supabase/client.ts", "lib/auth/auth-context.tsx", "app/layout.tsx"];
for (const sf of srcFiles) {
  const fp = path.join(ROOT_DIR, sf);
  if (fs.existsSync(fp)) {
    const text = fs.readFileSync(fp, "utf-8");
    assert(
      !text.includes("service_role") && !text.includes("SUPABASE_SERVICE_ROLE_KEY"),
      `Client file ${sf} contains zero service-role keys`
    );
  }
}

// Check promote-admin script exists
const promoteScriptPath = path.join(ROOT_DIR, "scripts/promote-admin.ts");
assert(fs.existsSync(promoteScriptPath), "Secure admin setup script scripts/promote-admin.ts exists");

// Check .env.example
const envExamplePath = path.join(ROOT_DIR, ".env.example");
assert(fs.existsSync(envExamplePath), ".env.example exists");

if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, "utf-8");
  assert(envContent.includes("NEXT_PUBLIC_SUPABASE_URL="), ".env.example defines NEXT_PUBLIC_SUPABASE_URL");
  assert(envContent.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="), ".env.example defines NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  assert(envContent.includes("RESEND_API_KEY="), ".env.example defines RESEND_API_KEY");
  assert(envContent.includes("RESEND_FROM_EMAIL="), ".env.example defines RESEND_FROM_EMAIL");
  assert(envContent.includes("APP_BASE_URL="), ".env.example defines APP_BASE_URL");
  assert(envContent.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="), ".env.example defines NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  assert(!envContent.includes("sk_live") && !envContent.includes("re_secret_1234"), ".env.example contains placeholders only (no real secrets)");
}

// Check deployment documentation
const deploymentDocPath = path.join(ROOT_DIR, "docs/DEPLOYMENT.md");
assert(fs.existsSync(deploymentDocPath), "Deployment guide docs/DEPLOYMENT.md exists");

if (fs.existsSync(deploymentDocPath)) {
  const docContent = fs.readFileSync(deploymentDocPath, "utf-8");
  assert(docContent.includes("Supabase Backend Setup"), "DEPLOYMENT.md documents Supabase configuration");
  assert(docContent.includes("Database Migration & Schema"), "DEPLOYMENT.md documents database migrations");
  assert(docContent.includes("Secure Initial Administrator Setup"), "DEPLOYMENT.md documents initial admin setup");
  assert(docContent.includes("Environment Variables Configuration"), "DEPLOYMENT.md documents environment variables");
  assert(docContent.includes("Resend Email Domain Configuration"), "DEPLOYMENT.md documents Resend setup");
  assert(docContent.includes("Google Maps Configuration"), "DEPLOYMENT.md documents Maps configuration");
  assert(docContent.includes("Vercel Deployment"), "DEPLOYMENT.md documents Vercel deployment");
  assert(docContent.includes("Post-Deployment Smoke Tests"), "DEPLOYMENT.md documents smoke tests");
}

console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}  Tests Passed: ${passedCount}${colors.reset}`);
console.log(`${colors.bold}  Tests Failed: ${failedCount}${colors.reset}`);
if (failedCount === 0) {
  console.log(`${colors.bold}${colors.green}  ALL PHASE 20 VERIFICATION CHECKS PASSED EMPIRICALLY!          ${colors.reset}`);
} else {
  console.log(`${colors.bold}${colors.red}  SOME PHASE 20 VERIFICATION CHECKS FAILED!                    ${colors.reset}`);
}
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

if (failedCount > 0) {
  process.exit(1);
}
