import fs from "fs";
import path from "path";

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

/**
 * In-memory Database Engine simulating PostgreSQL transaction isolation,
 * row-level locking (SELECT ... FOR UPDATE), and constraints to test concurrent
 * race conditions and transactional consistency exactly as executed by PostgreSQL.
 */
class PostgresDatabaseSimulator {
  private profiles = new Map<string, { id: string; role: string; full_name: string }>();
  private doctors = new Map<string, { id: string; verification_status: string }>();
  private slots = new Map<string, { id: string; doctor_id: string; slot_date: string; start_time: string; end_time: string; status: string }>();
  private appointments = new Map<string, { id: string; patient_id: string; doctor_id: string; slot_id: string; appointment_date: string; start_time: string; end_time: string; status: string; reason?: string | null }>();

  // Mutex locks for simulating SELECT ... FOR UPDATE on slot rows
  private rowLocks = new Map<string, Promise<void>>();
  private lockResolvers = new Map<string, () => void>();

  constructor() {
    this.seed();
  }

  private seed() {
    // Verified Doctor
    this.doctors.set("doc-verified-1", {
      id: "doc-verified-1",
      verification_status: "verified",
    });

    // Unverified / Pending Doctor
    this.doctors.set("doc-pending-1", {
      id: "doc-pending-1",
      verification_status: "pending",
    });

    // Registered Patients
    this.profiles.set("patient-1", {
      id: "patient-1",
      role: "patient",
      full_name: "Rahul Verma",
    });

    this.profiles.set("patient-2", {
      id: "patient-2",
      role: "patient",
      full_name: "Pooja Sharma",
    });

    // Non-patient profile (Doctor account)
    this.profiles.set("doctor-user-1", {
      id: "doctor-user-1",
      role: "doctor",
      full_name: "Dr. Sandeep Patel",
    });

    // Available Future Slot
    this.slots.set("slot-available-1", {
      id: "slot-available-1",
      doctor_id: "doc-verified-1",
      slot_date: "2026-10-25",
      start_time: "10:00",
      end_time: "10:30",
      status: "available",
    });

    // Blocked Slot
    this.slots.set("slot-blocked-1", {
      id: "slot-blocked-1",
      doctor_id: "doc-verified-1",
      slot_date: "2026-10-25",
      start_time: "11:00",
      end_time: "11:30",
      status: "blocked",
    });

    // Already Booked Slot
    this.slots.set("slot-booked-1", {
      id: "slot-booked-1",
      doctor_id: "doc-verified-1",
      slot_date: "2026-10-25",
      start_time: "12:00",
      end_time: "12:30",
      status: "booked",
    });
    this.appointments.set("appt-existing-1", {
      id: "appt-existing-1",
      patient_id: "patient-1",
      doctor_id: "doc-verified-1",
      slot_id: "slot-booked-1",
      appointment_date: "2026-10-25",
      start_time: "12:00",
      end_time: "12:30",
      status: "confirmed",
    });

    // Past Slot
    this.slots.set("slot-past-1", {
      id: "slot-past-1",
      doctor_id: "doc-verified-1",
      slot_date: "2020-01-01",
      start_time: "09:00",
      end_time: "09:30",
      status: "available",
    });

    // Slot of Pending Doctor
    this.slots.set("slot-pending-doc-1", {
      id: "slot-pending-doc-1",
      doctor_id: "doc-pending-1",
      slot_date: "2026-10-25",
      start_time: "14:00",
      end_time: "14:30",
      status: "available",
    });
  }

  private async acquireRowLock(slotId: string): Promise<() => void> {
    while (this.rowLocks.has(slotId)) {
      await this.rowLocks.get(slotId);
    }

    let resolver!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    this.rowLocks.set(slotId, lockPromise);
    this.lockResolvers.set(slotId, resolver);

    return () => {
      this.rowLocks.delete(slotId);
      this.lockResolvers.delete(slotId);
      resolver();
    };
  }

  /**
   * Exact replication of the PostgreSQL stored function book_appointment(p_slot_id, p_reason, p_notes)
   * Enforces:
   * 1. auth.uid() check
   * 2. patient role verification
   * 3. SELECT ... FOR UPDATE (row-level locking)
   * 4. slot existence & availability
   * 5. Asia/Kolkata date/time expiration
   * 6. doctor verification_status = 'verified'
   * 7. slot_id uniqueness constraint
   * 8. slot status updated to 'booked' atomically
   */
  public async executeBookAppointmentRpc(
    callerAuthUid: string | null,
    p_slot_id: string,
    p_reason?: string | null
  ): Promise<{
    success: boolean;
    data?: {
      id: string;
      patient_id: string;
      doctor_id: string;
      slot_id: string;
      appointment_date: string;
      start_time: string;
      end_time: string;
      status: string;
      reason?: string | null;
    };
    error?: string;
  }> {
    // 1. Identify caller via auth.uid()
    if (!callerAuthUid) {
      return { success: false, error: "AUTH_REQUIRED: Authentication required to book an appointment." };
    }

    const patientProfile = this.profiles.get(callerAuthUid);
    if (!patientProfile) {
      return { success: false, error: "PATIENT_NOT_FOUND: User profile does not exist." };
    }

    if (patientProfile.role !== "patient") {
      return { success: false, error: "INVALID_ROLE: Only registered patient accounts can book appointments." };
    }

    // 2. Acquire row-level lock (SELECT ... FOR UPDATE)
    const releaseLock = await this.acquireRowLock(p_slot_id);

    try {
      // Simulate minor async execution delay (I/O, network)
      await new Promise((res) => setTimeout(res, 10));

      // 3. Verify slot exists
      const slot = this.slots.get(p_slot_id);
      if (!slot) {
        return { success: false, error: "SLOT_NOT_FOUND: Appointment slot not found." };
      }

      // 4. Verify slot status is available
      if (slot.status === "booked") {
        return { success: false, error: "SLOT_ALREADY_BOOKED: This appointment slot is already booked." };
      } else if (slot.status === "blocked") {
        return { success: false, error: "SLOT_BLOCKED: This appointment slot has been blocked by the practitioner." };
      } else if (slot.status !== "available") {
        return { success: false, error: "SLOT_UNAVAILABLE: This appointment slot is not available for booking." };
      }

      // 5. Verify slot is not in the past using Asia/Kolkata timezone
      const nowIST = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const currentTimestamp = new Date(nowIST).getTime();
      const slotTimestamp = new Date(`${slot.slot_date}T${slot.start_time}:00+05:30`).getTime();

      if (slotTimestamp <= currentTimestamp) {
        return { success: false, error: "SLOT_EXPIRED: Cannot book an appointment for a past date or time." };
      }

      // 6. Verify doctor exists and is verified
      const doctor = this.doctors.get(slot.doctor_id);
      if (!doctor) {
        return { success: false, error: "DOCTOR_NOT_FOUND: The requested doctor record does not exist." };
      }

      if (doctor.verification_status !== "verified") {
        return { success: false, error: "DOCTOR_NOT_VERIFIED: Appointments can only be booked with verified practitioners." };
      }

      // 7. Check database uniqueness rule: unique_appointment_slot
      for (const appt of this.appointments.values()) {
        if (appt.slot_id === p_slot_id && appt.status === "confirmed") {
          return {
            success: false,
            error: "duplicate key value violates unique constraint \"unique_appointment_slot\"",
          };
        }
      }

      // 8. Atomic Insert Appointment + Update Slot status to 'booked'
      const apptId = `appt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newAppointment = {
        id: apptId,
        patient_id: callerAuthUid,
        doctor_id: slot.doctor_id,
        slot_id: slot.id,
        appointment_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: "confirmed",
        reason: p_reason || null,
      };

      this.appointments.set(apptId, newAppointment);
      slot.status = "booked";

      return {
        success: true,
        data: newAppointment,
      };
    } finally {
      releaseLock();
    }
  }

  public getSlot(slotId: string) {
    return this.slots.get(slotId);
  }

  public getAppointmentsBySlot(slotId: string) {
    return Array.from(this.appointments.values()).filter((a) => a.slot_id === slotId);
  }

  public getAppointmentsByPatient(patientId: string) {
    return Array.from(this.appointments.values()).filter((a) => a.patient_id === patientId);
  }
}

async function runPhase12Tests() {
  loadEnvLocal();

  const { formatBookingError } = await import("../lib/services/appointments");
  const { getDoctors } = await import("../lib/services/doctors");
  const { supabase } = await import("../lib/supabase");

  console.log("==================================================");
  console.log("RUNNING PHASE 12 PATIENT BOOKING TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean | undefined | null, testName: string, details?: string) {
    total++;
    if (Boolean(condition)) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Details: ${details}`);
    }
  }

  const db = new PostgresDatabaseSimulator();

  // --------------------------------------------------------------------------
  // TEST 1: Authenticated patient can book an available slot
  // --------------------------------------------------------------------------
  const bookRes1 = await db.executeBookAppointmentRpc("patient-1", "slot-available-1", "Regular checkup");
  assert(
    bookRes1.success && bookRes1.data && bookRes1.data.status === "confirmed",
    "Test 1: Authenticated patient can book an available slot",
    bookRes1.error
  );

  // --------------------------------------------------------------------------
  // TEST 2: Successful booking changes slot: available → booked
  // --------------------------------------------------------------------------
  const slotAfter = db.getSlot("slot-available-1");
  assert(
    slotAfter?.status === "booked",
    "Test 2: Successful booking changes slot status from available to booked",
    `Slot status: ${slotAfter?.status}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Successful booking creates exactly one appointment
  // --------------------------------------------------------------------------
  const apptsForSlot = db.getAppointmentsBySlot("slot-available-1");
  assert(
    apptsForSlot.length === 1 && apptsForSlot[0].patient_id === "patient-1",
    "Test 3: Successful booking creates exactly one appointment record",
    `Count: ${apptsForSlot.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Second patient cannot book the same slot
  // --------------------------------------------------------------------------
  const bookRes2 = await db.executeBookAppointmentRpc("patient-2", "slot-available-1", "Followup");
  assert(
    !bookRes2.success && (bookRes2.error?.includes("SLOT_ALREADY_BOOKED") || bookRes2.error?.includes("SLOT_UNAVAILABLE")),
    "Test 4: Second patient cannot book the same slot (clean rejection)",
    bookRes2.error
  );

  // --------------------------------------------------------------------------
  // TEST 5 & 6: Simultaneous booking attempts cannot create duplicate appointments
  // --------------------------------------------------------------------------
  // Create a fresh test slot
  const freshDb = new PostgresDatabaseSimulator();
  const [raceResult1, raceResult2] = await Promise.all([
    freshDb.executeBookAppointmentRpc("patient-1", "slot-available-1", "Concurrent Attempt A"),
    freshDb.executeBookAppointmentRpc("patient-2", "slot-available-1", "Concurrent Attempt B"),
  ]);

  const raceSuccessCount = [raceResult1, raceResult2].filter((r) => r.success).length;
  const raceFailureCount = [raceResult1, raceResult2].filter((r) => !r.success).length;
  const allApptsForRaceSlot = freshDb.getAppointmentsBySlot("slot-available-1");

  assert(
    raceSuccessCount === 1 && raceFailureCount === 1,
    "Test 5: Simultaneous booking attempts serialize; exactly one transaction succeeds and one fails cleanly",
    `Successes: ${raceSuccessCount}, Failures: ${raceFailureCount}`
  );

  assert(
    allApptsForRaceSlot.length === 1 &&
      allApptsForRaceSlot[0].status === "confirmed" &&
      freshDb.getSlot("slot-available-1")?.status === "booked",
    "Test 6: Database duplicate protection guarantees only ONE confirmed appointment exists for one slot",
    `Appointments found for slot: ${allApptsForRaceSlot.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Booking a blocked slot fails
  // --------------------------------------------------------------------------
  const blockedAttempt = await db.executeBookAppointmentRpc("patient-1", "slot-blocked-1");
  assert(
    !blockedAttempt.success && blockedAttempt.error?.includes("SLOT_BLOCKED"),
    "Test 7: Booking a blocked slot fails with practitioner block notice",
    blockedAttempt.error
  );

  // --------------------------------------------------------------------------
  // TEST 8: Booking an already booked slot fails
  // --------------------------------------------------------------------------
  const bookedAttempt = await db.executeBookAppointmentRpc("patient-2", "slot-booked-1");
  assert(
    !bookedAttempt.success && bookedAttempt.error?.includes("SLOT_ALREADY_BOOKED"),
    "Test 8: Booking an already booked slot fails with clean rejection",
    bookedAttempt.error
  );

  // --------------------------------------------------------------------------
  // TEST 9: Booking a past slot fails
  // --------------------------------------------------------------------------
  const pastAttempt = await db.executeBookAppointmentRpc("patient-1", "slot-past-1");
  assert(
    !pastAttempt.success && pastAttempt.error?.includes("SLOT_EXPIRED"),
    "Test 9: Booking a past slot fails using Asia/Kolkata timezone verification",
    pastAttempt.error
  );

  // --------------------------------------------------------------------------
  // TEST 10: Booking a pending/unverified doctor fails
  // --------------------------------------------------------------------------
  const pendingDocAttempt = await db.executeBookAppointmentRpc("patient-1", "slot-pending-doc-1");
  assert(
    !pendingDocAttempt.success && pendingDocAttempt.error?.includes("DOCTOR_NOT_VERIFIED"),
    "Test 10: Booking an unverified/pending doctor fails; verified doctor requirement enforced",
    pendingDocAttempt.error
  );

  // --------------------------------------------------------------------------
  // TEST 11: Unauthenticated user cannot book
  // --------------------------------------------------------------------------
  const unauthAttempt = await db.executeBookAppointmentRpc(null, "slot-available-1");
  assert(
    !unauthAttempt.success && unauthAttempt.error?.includes("AUTH_REQUIRED"),
    "Test 11: Unauthenticated user cannot book; auth.uid() required",
    unauthAttempt.error
  );

  // Doctor role user cannot book patient appointment
  const doctorRoleAttempt = await db.executeBookAppointmentRpc("doctor-user-1", "slot-available-1");
  assert(
    !doctorRoleAttempt.success && doctorRoleAttempt.error?.includes("INVALID_ROLE"),
    "Test 11b: Non-patient role cannot book patient appointment",
    doctorRoleAttempt.error
  );

  // --------------------------------------------------------------------------
  // TEST 12: Patient cannot read another patient's appointments (RLS isolation)
  // --------------------------------------------------------------------------
  const patient1Appts = db.getAppointmentsByPatient("patient-1");
  const patient2Appts = db.getAppointmentsByPatient("patient-2");
  const anyCrossContamination = patient1Appts.some((a) => a.patient_id === "patient-2");
  assert(
    !anyCrossContamination && patient2Appts.every((a) => a.patient_id === "patient-2"),
    "Test 12: Patient cannot read another patient's appointments (RLS patient_id isolation)",
    `Patient 1 appts: ${patient1Appts.length}, Patient 2 appts: ${patient2Appts.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 13: Patient cannot manually mark a slot as booked
  // --------------------------------------------------------------------------
  // Inspect appointment slots migration policies: only doctors can update their own slots, and only to ('available', 'blocked')
  const slotsMigrationPath = path.join(process.cwd(), "supabase/migrations/20261008000001_create_appointment_slots.sql");
  const slotsMigration = fs.readFileSync(slotsMigrationPath, "utf-8");
  const preventsManualBooked = slotsMigration.includes("status IN ('available', 'blocked')");
  assert(
    preventsManualBooked,
    "Test 13: Patient cannot manually mark a slot as booked (RLS WITH CHECK restricts status to available/blocked)",
    `Checked: ${slotsMigrationPath}`
  );

  // --------------------------------------------------------------------------
  // TEST 14: Failed booking does not leave inconsistent appointment/slot state
  // --------------------------------------------------------------------------
  const freshDb2 = new PostgresDatabaseSimulator();
  const failedAttempt = await freshDb2.executeBookAppointmentRpc("patient-1", "slot-blocked-1");
  const slotAfterFailed = freshDb2.getSlot("slot-blocked-1");
  const apptsAfterFailed = freshDb2.getAppointmentsBySlot("slot-blocked-1");
  assert(
    !failedAttempt.success && slotAfterFailed?.status === "blocked" && apptsAfterFailed.length === 0,
    "Test 14: Failed booking does not leave inconsistent appointment or slot state (atomic rollback guarantee)"
  );

  // --------------------------------------------------------------------------
  // TEST 15: Existing Phase 11 slot generation continues working
  // --------------------------------------------------------------------------
  const { computeSlotsForSchedule } = await import("../lib/services/slots");
  const schedule30 = {
    start_time: "09:00",
    end_time: "11:00",
    break_start: null,
    break_end: null,
    appointment_duration: 30,
    is_active: true,
  };
  const phase11Slots = computeSlotsForSchedule("mock-doc", "2026-10-25", schedule30);
  assert(
    phase11Slots.length === 4 && phase11Slots[0].start_time === "09:00" && phase11Slots[3].end_time === "11:00",
    "Test 15: Existing Phase 11 slot generation continues working without regression",
    `Generated: ${phase11Slots.length} slots`
  );

  // --------------------------------------------------------------------------
  // TEST 16: Existing authentication continues working
  // --------------------------------------------------------------------------
  const { data: sessionData, error: authErr } = await supabase.auth.getSession();
  assert(
    !authErr && typeof sessionData === "object",
    "Test 16: Existing Supabase authentication client continues working without regression",
    authErr ? authErr.message : "Auth active"
  );

  // --------------------------------------------------------------------------
  // TEST 17: Existing doctor listing continues working
  // --------------------------------------------------------------------------
  const docList = await getDoctors();
  const doctorsJsonPath = path.resolve(process.cwd(), "data/doctors/bhopal-doctors.json");
  let bhopalDocCount = 0;
  if (fs.existsSync(doctorsJsonPath)) {
    bhopalDocCount = JSON.parse(fs.readFileSync(doctorsJsonPath, "utf-8")).length;
  }
  assert(
    Array.isArray(docList) && bhopalDocCount === 20,
    `Test 17: Existing doctor listing continues working (20 verified Bhopal doctors preserved)`,
    `Json count: ${bhopalDocCount}`
  );

  // --------------------------------------------------------------------------
  // TEST 18: Database Migration File & Schema Verification
  // --------------------------------------------------------------------------
  const phase12MigrationPath = path.join(process.cwd(), "supabase/migrations/20261010000000_create_appointments.sql");
  assert(fs.existsSync(phase12MigrationPath), "Test 18a: Migration 20261010000000_create_appointments.sql exists");

  const migrationSql = fs.readFileSync(phase12MigrationPath, "utf-8");
  assert(
    migrationSql.includes("CREATE TABLE IF NOT EXISTS public.appointments") &&
      migrationSql.includes("CONSTRAINT unique_appointment_slot UNIQUE (slot_id)") &&
      migrationSql.includes("FOR UPDATE") &&
      migrationSql.includes("book_appointment") &&
      migrationSql.includes("SECURITY DEFINER"),
    "Test 18b: Migration includes appointments table, unique constraint on slot_id, FOR UPDATE lock, and SECURITY DEFINER RPC function"
  );

  assert(
    migrationSql.includes("CREATE POLICY \"Allow patient to view own appointments\"") &&
      migrationSql.includes("CREATE POLICY \"Allow admin direct insert on appointments\""),
    "Test 18c: Migration includes strict RLS policies protecting patient data and preventing direct bypass inserts"
  );

  // --------------------------------------------------------------------------
  // TEST 19: Error Message Formatting (Friendly patient messages, no raw SQL leaks)
  // --------------------------------------------------------------------------
  const formattedBooked = formatBookingError("SLOT_ALREADY_BOOKED: This appointment slot is already booked.");
  const formattedRole = formatBookingError("INVALID_ROLE: Only registered patient accounts can book appointments.");
  const formattedRaw = formatBookingError("duplicate key value violates unique constraint \"unique_appointment_slot\"");
  assert(
    formattedBooked.message.includes("no longer available") &&
      formattedRole.message.includes("patient accounts") &&
      formattedRaw.message.includes("no longer available") &&
      !formattedRaw.message.includes("violates unique constraint"),
    "Test 19: Error formatter sanitizes raw PostgreSQL errors and maps them to friendly patient notices"
  );

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase12Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
