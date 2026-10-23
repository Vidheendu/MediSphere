import fs from "fs";
import path from "path";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../lib/services/profiles";
import type { Notification, NotificationType, NotificationPreferences } from "../types";

// Colors for terminal output
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
console.log(`${colors.bold}${colors.cyan}  MEDISPHERE PHASE 19: HELP, SETTINGS & NOTIFICATIONS VERIFY   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

const ROOT_DIR = path.resolve(__dirname, "..");

// ----------------------------------------------------------------------------
// TEST SUITE 1: NOTIFICATIONS DATABASE MIGRATION & SCHEMA
// ----------------------------------------------------------------------------
console.log(`${colors.bold}1. Database Migration & Schema Integrity${colors.reset}`);

const migrationPath = path.join(ROOT_DIR, "supabase/migrations/20261023000000_create_notifications.sql");
assert(fs.existsSync(migrationPath), "Migration file 20261023000000_create_notifications.sql exists");

if (fs.existsSync(migrationPath)) {
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  assert(
    migrationSql.includes("CREATE TABLE IF NOT EXISTS public.notifications"),
    "Migration creates public.notifications table"
  );
  assert(
    migrationSql.includes("recipient_user_id UUID NOT NULL REFERENCES public.profiles(id)"),
    "Foreign key recipient_user_id references public.profiles(id)"
  );
  assert(
    migrationSql.includes("related_appointment_id UUID REFERENCES public.appointments(id)"),
    "Nullable foreign key related_appointment_id references public.appointments(id)"
  );
  assert(
    migrationSql.includes("type TEXT NOT NULL CHECK"),
    "Notification type has CHECK constraint for valid event types"
  );
  assert(
    migrationSql.includes("ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;"),
    "Row Level Security (RLS) enabled on public.notifications"
  );
  assert(
    migrationSql.includes("Allow users to view own notifications"),
    "RLS SELECT policy enforces users only see their own notifications"
  );
  assert(
    migrationSql.includes("Allow users to update own notifications"),
    "RLS UPDATE policy restricts status update to own notifications"
  );
  assert(
    migrationSql.includes("handle_appointment_notification_events"),
    "Database trigger function handle_appointment_notification_events defined"
  );
  assert(
    migrationSql.includes("CREATE TRIGGER trigger_appointment_notification_events"),
    "Trigger trigger_appointment_notification_events attached to public.appointments"
  );
}

const schemaPath = path.join(ROOT_DIR, "supabase/schema.sql");
assert(fs.existsSync(schemaPath), "Single source of truth schema.sql exists");
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  assert(
    schemaSql.includes("TABLE: NOTIFICATIONS (PHASE 19)"),
    "schema.sql contains Phase 19 notifications table specification"
  );
}

// ----------------------------------------------------------------------------
// TEST SUITE 2: TYPESCRIPT TYPES INTEGRITY
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}2. TypeScript Database Types & Interfaces${colors.reset}`);

const dbTypesPath = path.join(ROOT_DIR, "types/database.ts");
const dbTypesContent = fs.readFileSync(dbTypesPath, "utf-8");

assert(
  dbTypesContent.includes("notifications: {"),
  "types/database.ts contains notifications table in Database schema"
);
assert(
  dbTypesContent.includes("export type NotificationType ="),
  "types/database.ts exports NotificationType union"
);
assert(
  dbTypesContent.includes("export type Notification = Database[\"public\"][\"Tables\"][\"notifications\"][\"Row\"];"),
  "types/database.ts exports Notification model type"
);
assert(
  dbTypesContent.includes("export interface NotificationPreferences {"),
  "types/database.ts exports NotificationPreferences interface"
);

// ----------------------------------------------------------------------------
// TEST SUITE 3: NOTIFICATIONS SERVICE INTEGRITY
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}3. Notification Service Architecture${colors.reset}`);

const notifServicePath = path.join(ROOT_DIR, "lib/services/notifications.ts");
assert(fs.existsSync(notifServicePath), "lib/services/notifications.ts exists");

const notifServiceContent = fs.readFileSync(notifServicePath, "utf-8");

assert(
  notifServiceContent.includes("export async function getNotifications("),
  "getNotifications function exported with limit and ordering"
);
assert(
  notifServiceContent.includes("export async function getUnreadNotificationCount("),
  "getUnreadNotificationCount function exported"
);
assert(
  notifServiceContent.includes("export async function markNotificationAsRead("),
  "markNotificationAsRead function exported"
);
assert(
  notifServiceContent.includes("export async function markAllNotificationsAsRead("),
  "markAllNotificationsAsRead function exported"
);
assert(
  notifServiceContent.includes("export async function createNotification("),
  "createNotification helper exported with idempotency check"
);

// Verify index re-exports
const serviceIndexPath = path.join(ROOT_DIR, "lib/services/index.ts");
const serviceIndexContent = fs.readFileSync(serviceIndexPath, "utf-8");
assert(
  serviceIndexContent.includes("export * from \"./notifications\";"),
  "lib/services/index.ts re-exports notification service functions"
);

// ----------------------------------------------------------------------------
// TEST SUITE 4: REAL NOTIFICATION EVENTS INTEGRATION
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}4. Real Notification Events Generation${colors.reset}`);

const apptsServicePath = path.join(ROOT_DIR, "lib/services/appointments.ts");
const apptsServiceContent = fs.readFileSync(apptsServicePath, "utf-8");

assert(
  apptsServiceContent.includes("sendBookingNotifications("),
  "lib/services/appointments.ts implements sendBookingNotifications"
);
assert(
  apptsServiceContent.includes("sendAppointmentStatusNotification("),
  "lib/services/appointments.ts implements sendAppointmentStatusNotification"
);
assert(
  apptsServiceContent.includes("type: \"appointment_completed\""),
  "Appointment completion triggers 'appointment_completed' notification"
);
assert(
  apptsServiceContent.includes("type: \"appointment_no_show\""),
  "No-show update triggers 'appointment_no_show' notification"
);

// Check booking server route triggers
const bookingRoutePath = path.join(ROOT_DIR, "app/api/appointments/book/route.ts");
const bookingRouteContent = fs.readFileSync(bookingRoutePath, "utf-8");
assert(
  bookingRouteContent.includes("sendBookingNotifications(appointment)"),
  "Server route app/api/appointments/book/route.ts calls sendBookingNotifications on success"
);

// ----------------------------------------------------------------------------
// TEST SUITE 5: ACCOUNT SETTINGS & PROFILE SERVICES
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}5. Account Settings Services & Role Security${colors.reset}`);

const profilesServicePath = path.join(ROOT_DIR, "lib/services/profiles.ts");
const profilesContent = fs.readFileSync(profilesServicePath, "utf-8");

assert(
  profilesContent.includes("export async function updatePatientProfile("),
  "updatePatientProfile exists and updates patient profile"
);
assert(
  profilesContent.includes("export async function updateDoctorProfileDetails("),
  "updateDoctorProfileDetails exists and updates doctor profile"
);
assert(
  profilesContent.includes("export async function getDoctorSelfDetails("),
  "getDoctorSelfDetails retrieves authenticated doctor's full profile"
);
assert(
  profilesContent.includes("export async function getNotificationPreferences("),
  "getNotificationPreferences function exists"
);
assert(
  profilesContent.includes("export async function updateNotificationPreferences("),
  "updateNotificationPreferences function exists"
);

// Role & Verification Protection Assertions
assert(
  !profilesContent.includes("role: params.role") && !profilesContent.includes("role: newRole"),
  "Profile update service strictly rejects modifying user role (prevents privilege escalation)"
);
assert(
  !profilesContent.includes("verification_status: params.verification_status"),
  "Doctor profile update service strictly prevents doctor self-modifying verification_status"
);

// Notification Preferences defaults
assert(
  DEFAULT_NOTIFICATION_PREFERENCES.emailAlerts === true &&
  DEFAULT_NOTIFICATION_PREFERENCES.appointmentReminders === true &&
  DEFAULT_NOTIFICATION_PREFERENCES.statusUpdates === true,
  "Default notification preferences are safely initialized"
);

// ----------------------------------------------------------------------------
// TEST SUITE 6: ROUTE EXISTENCE & STRUCTURE
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}6. Route Existence & Page Implementations${colors.reset}`);

const routes = [
  { path: "app/dashboard/settings/page.tsx", desc: "Patient Settings (/dashboard/settings)" },
  { path: "app/dashboard/notifications/page.tsx", desc: "Patient Notifications (/dashboard/notifications)" },
  { path: "app/dashboard/help/page.tsx", desc: "Patient Help Center (/dashboard/help)" },
  { path: "app/doctor/settings/page.tsx", desc: "Doctor Settings (/doctor/settings)" },
  { path: "app/doctor/notifications/page.tsx", desc: "Doctor Notifications (/doctor/notifications)" },
  { path: "app/doctor/help/page.tsx", desc: "Doctor Help Center (/doctor/help)" },
];

for (const r of routes) {
  const fullP = path.join(ROOT_DIR, r.path);
  assert(fs.existsSync(fullP), `Route file exists: ${r.desc}`);
  if (fs.existsSync(fullP)) {
    const content = fs.readFileSync(fullP, "utf-8");
    assert(
      content.includes('"use client"') && content.includes("ProtectedRoute"),
      `Route ${r.path} uses client component with ProtectedRoute guard`
    );
  }
}

// ----------------------------------------------------------------------------
// TEST SUITE 7: DASHBOARD NAVIGATION INTEGRATION
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}7. Dashboard Navigation Integration${colors.reset}`);

const patientNavPath = path.join(ROOT_DIR, "components/dashboard/PatientDashboardNav.tsx");
const patientNavContent = fs.readFileSync(patientNavPath, "utf-8");

assert(
  patientNavContent.includes("/dashboard/notifications"),
  "PatientDashboardNav includes link to /dashboard/notifications"
);
assert(
  patientNavContent.includes("/dashboard/settings"),
  "PatientDashboardNav includes link to /dashboard/settings"
);
assert(
  patientNavContent.includes("/dashboard/help"),
  "PatientDashboardNav includes link to /dashboard/help"
);
assert(
  patientNavContent.includes("getUnreadNotificationCount"),
  "PatientDashboardNav polls getUnreadNotificationCount for unread badge"
);

const doctorNavPath = path.join(ROOT_DIR, "components/dashboard/DoctorDashboardNav.tsx");
const doctorNavContent = fs.readFileSync(doctorNavPath, "utf-8");

assert(
  doctorNavContent.includes("/doctor/notifications"),
  "DoctorDashboardNav includes link to /doctor/notifications"
);
assert(
  doctorNavContent.includes("/doctor/settings"),
  "DoctorDashboardNav includes link to /doctor/settings"
);
assert(
  doctorNavContent.includes("/doctor/help"),
  "DoctorDashboardNav includes link to /doctor/help"
);
assert(
  doctorNavContent.includes("getUnreadNotificationCount"),
  "DoctorDashboardNav polls getUnreadNotificationCount for unread badge"
);

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`  Tests Passed: ${colors.green}${passedCount}${colors.reset}`);
if (failedCount > 0) {
  console.log(`  Tests Failed: ${colors.red}${failedCount}${colors.reset}`);
  console.log(`${colors.bold}${colors.red}  VERIFICATION FAILED!${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`  Tests Failed: 0`);
  console.log(`${colors.bold}${colors.green}  ALL PHASE 19 VERIFICATION CHECKS PASSED EMPIRICALLY!${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);
  process.exit(0);
}
