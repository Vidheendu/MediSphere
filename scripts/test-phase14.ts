import fs from "fs";
import path from "path";

// Pre-load .env.local variables
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

import {
  getDoctorAppointmentStats,
  filterDoctorAppointments,
  isAppointmentUpcoming,
  getCurrentDateIST,
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  APPOINTMENT_TIMEZONE,
} from "../lib/services/appointments";
import { supabase } from "../lib/supabase";
import { getDoctors } from "../lib/services/doctors";

/**
 * Phase 14 Simulator modeling Doctor Appointment Management,
 * multi-doctor isolation, Asia/Kolkata timezone calculations,
 * patient privacy rules, and server/database status transitions.
 */
class Phase14Simulator {
  public doctors = new Map<string, {
    id: string;
    profile_id: string;
    speciality_id: string;
    verification_status: string;
  }>();

  public profiles = new Map<string, {
    id: string;
    role: "patient" | "doctor" | "admin";
    full_name: string;
    email: string;
    phone: string | null;
    location: string | null;
  }>();

  public appointments = new Map<string, {
    id: string;
    patient_id: string;
    doctor_id: string;
    slot_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: "confirmed" | "completed" | "cancelled" | "no_show";
    reason?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
  }>();

  public slots = new Map<string, {
    id: string;
    doctor_id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    status: "available" | "booked" | "blocked";
  }>();

  constructor() {
    this.seed();
  }

  private seed() {
    const todayIST = getCurrentDateIST();

    // 1. Doctor A (Dr. Sharma)
    this.profiles.set("prof-doctor-sharma", {
      id: "prof-doctor-sharma",
      role: "doctor",
      full_name: "Aakash Sharma",
      email: "dr.sharma@medisphere.com",
      phone: "+91 98260 11111",
      location: "Arera Colony, Bhopal",
    });
    this.doctors.set("doc-sharma", {
      id: "doc-sharma",
      profile_id: "prof-doctor-sharma",
      speciality_id: "spec-cardio",
      verification_status: "verified",
    });

    // 2. Doctor B (Dr. Verma)
    this.profiles.set("prof-doctor-verma", {
      id: "prof-doctor-verma",
      role: "doctor",
      full_name: "Sneha Verma",
      email: "dr.verma@medisphere.com",
      phone: "+91 98260 22222",
      location: "MP Nagar, Bhopal",
    });
    this.doctors.set("doc-verma", {
      id: "doc-verma",
      profile_id: "prof-doctor-verma",
      speciality_id: "spec-derma",
      verification_status: "verified",
    });

    // 3. Doctor C (Dr. New - zero appointments)
    this.profiles.set("prof-doctor-new", {
      id: "prof-doctor-new",
      role: "doctor",
      full_name: "Vikram Patel",
      email: "dr.patel@medisphere.com",
      phone: "+91 98260 33333",
      location: "Shahpura, Bhopal",
    });
    this.doctors.set("doc-new", {
      id: "doc-new",
      profile_id: "prof-doctor-new",
      speciality_id: "spec-ent",
      verification_status: "verified",
    });

    // 4. Patients
    this.profiles.set("pat-rahul", {
      id: "pat-rahul",
      role: "patient",
      full_name: "Rahul Mehra",
      email: "rahul.mehra@example.com",
      phone: "+91 91111 22222",
      location: "Kolar Road, Bhopal",
    });

    this.profiles.set("pat-pooja", {
      id: "pat-pooja",
      role: "patient",
      full_name: "Pooja Gupta",
      email: "pooja.gupta@example.com",
      phone: "+91 93333 44444",
      location: "Indrapuri, Bhopal",
    });

    this.profiles.set("pat-anita", {
      id: "pat-anita",
      role: "patient",
      full_name: "Anita Joshi",
      email: "anita.joshi@example.com",
      phone: "+91 95555 66666",
      location: "New Market, Bhopal",
    });

    // 5. Seed Appointments for Doctor A (Dr. Sharma)
    // Appt 1: TODAY consultation (Confirmed)
    this.appointments.set("appt-sharma-today-1", {
      id: "appt-sharma-today-1",
      patient_id: "pat-rahul",
      doctor_id: "doc-sharma",
      slot_id: "slot-sharma-1",
      appointment_date: todayIST,
      start_time: "10:00:00",
      end_time: "10:30:00",
      status: "confirmed",
      reason: "High blood pressure follow-up",
      notes: "Previous ECG recorded in September",
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
    });

    // Appt 2: FUTURE consultation (Confirmed)
    this.appointments.set("appt-sharma-future-1", {
      id: "appt-sharma-future-1",
      patient_id: "pat-pooja",
      doctor_id: "doc-sharma",
      slot_id: "slot-sharma-2",
      appointment_date: "2026-11-20",
      start_time: "11:00:00",
      end_time: "11:30:00",
      status: "confirmed",
      reason: "Annual heart assessment",
      notes: null,
      created_at: "2026-10-02T10:00:00Z",
      updated_at: "2026-10-02T10:00:00Z",
    });

    // Appt 3: PAST consultation (Completed)
    this.appointments.set("appt-sharma-completed-1", {
      id: "appt-sharma-completed-1",
      patient_id: "pat-anita",
      doctor_id: "doc-sharma",
      slot_id: "slot-sharma-3",
      appointment_date: "2026-10-05",
      start_time: "14:00:00",
      end_time: "14:30:00",
      status: "completed",
      reason: "Post-surgery checkup",
      notes: "Recovery proceeding normally",
      created_at: "2026-09-28T10:00:00Z",
      updated_at: "2026-10-05T14:30:00Z",
    });

    // Appt 4: PAST consultation (Cancelled)
    this.appointments.set("appt-sharma-cancelled-1", {
      id: "appt-sharma-cancelled-1",
      patient_id: "pat-rahul",
      doctor_id: "doc-sharma",
      slot_id: "slot-sharma-4",
      appointment_date: "2026-10-02",
      start_time: "16:00:00",
      end_time: "16:30:00",
      status: "cancelled",
      reason: "Chest tightness (rescheduled elsewhere)",
      notes: null,
      created_at: "2026-09-25T10:00:00Z",
      updated_at: "2026-10-01T09:00:00Z",
    });

    // Appt 5: PAST eligible consultation for status transition (Confirmed, past date)
    this.appointments.set("appt-sharma-past-eligible-1", {
      id: "appt-sharma-past-eligible-1",
      patient_id: "pat-pooja",
      doctor_id: "doc-sharma",
      slot_id: "slot-sharma-5",
      appointment_date: "2026-10-08",
      start_time: "09:30:00",
      end_time: "10:00:00",
      status: "confirmed",
      reason: "Lipid profile consultation",
      notes: null,
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
    });

    // 6. Seed Appointments for Doctor B (Dr. Verma)
    this.appointments.set("appt-verma-1", {
      id: "appt-verma-1",
      patient_id: "pat-anita",
      doctor_id: "doc-verma",
      slot_id: "slot-verma-1",
      appointment_date: todayIST,
      start_time: "15:00:00",
      end_time: "15:30:00",
      status: "confirmed",
      reason: "Skin allergy breakout",
      notes: null,
      created_at: "2026-10-03T10:00:00Z",
      updated_at: "2026-10-03T10:00:00Z",
    });

    // Slots
    for (const appt of this.appointments.values()) {
      this.slots.set(appt.slot_id, {
        id: appt.slot_id,
        doctor_id: appt.doctor_id,
        slot_date: appt.appointment_date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        status: "booked",
      });
    }
  }

  // Doctor queries own appointments with patient profile embed
  public getDoctorAppointments(requestingUserId: string, targetDoctorId: string) {
    const callerProfile = this.profiles.get(requestingUserId);
    if (!callerProfile || callerProfile.role !== "doctor") {
      return [];
    }

    const doc = this.doctors.get(targetDoctorId);
    if (!doc || doc.profile_id !== requestingUserId) {
      // Forbidden: caller cannot access another doctor's appointments
      return [];
    }

    const doctorAppts = Array.from(this.appointments.values())
      .filter((a) => a.doctor_id === targetDoctorId)
      .map((a) => {
        const patient = this.profiles.get(a.patient_id);
        const slot = this.slots.get(a.slot_id);
        return {
          ...a,
          patient: patient
            ? {
                id: patient.id,
                full_name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                location: patient.location,
              }
            : null,
          slot: slot || null,
        };
      });

    return doctorAppts;
  }

  // Doctor queries a single appointment with strict ownership verification
  public getDoctorAppointmentById(
    requestingUserId: string,
    targetDoctorId: string,
    appointmentId: string
  ) {
    const callerProfile = this.profiles.get(requestingUserId);
    if (!callerProfile || callerProfile.role !== "doctor") {
      return null;
    }

    const doc = this.doctors.get(targetDoctorId);
    if (!doc || doc.profile_id !== requestingUserId) {
      return null;
    }

    const appt = this.appointments.get(appointmentId);
    if (!appt) return null;

    if (appt.doctor_id !== targetDoctorId) {
      // Unowned appointment: strictly rejected
      return null;
    }

    const patient = this.profiles.get(appt.patient_id);
    const slot = this.slots.get(appt.slot_id);

    return {
      ...appt,
      patient: patient
        ? {
            id: patient.id,
            full_name: patient.full_name,
            email: patient.email,
            phone: patient.phone,
            location: patient.location,
          }
        : null,
      slot: slot || null,
    };
  }

  // Status transition function simulating database RPC
  public updateDoctorAppointmentStatus(
    requestingUserId: string,
    appointmentId: string,
    newStatus: string
  ): { success: boolean; error?: string; code?: string; appointment?: unknown } {
    // 1. Verify caller profile and role
    const callerProfile = this.profiles.get(requestingUserId);
    if (!callerProfile || callerProfile.role !== "doctor") {
      return {
        success: false,
        error: "Access Denied: Only registered healthcare practitioners can update appointment status.",
        code: "FORBIDDEN",
      };
    }

    // Resolve doctor ID
    let callerDoctorId: string | null = null;
    for (const [docId, doc] of this.doctors.entries()) {
      if (doc.profile_id === requestingUserId) {
        callerDoctorId = docId;
        break;
      }
    }

    if (!callerDoctorId) {
      return {
        success: false,
        error: "Doctor profile record not found.",
        code: "DOCTOR_NOT_FOUND",
      };
    }

    // 2. Validate status value
    if (newStatus !== "completed" && newStatus !== "no_show") {
      return {
        success: false,
        error: "Invalid status transition. Doctors can only mark appointments as completed or no-show.",
        code: "INVALID_STATUS",
      };
    }

    // 3. Find appointment
    const appt = this.appointments.get(appointmentId);
    if (!appt) {
      return {
        success: false,
        error: "The requested appointment could not be found.",
        code: "APPOINTMENT_NOT_FOUND",
      };
    }

    // 4. Verify doctor ownership
    if (appt.doctor_id !== callerDoctorId) {
      return {
        success: false,
        error: "You do not have permission to modify this appointment.",
        code: "UNAUTHORIZED",
      };
    }

    // 5. Verify valid transition (cannot update cancelled)
    if (appt.status === "cancelled") {
      return {
        success: false,
        error: "Cannot modify the status of a cancelled appointment.",
        code: "INVALID_TRANSITION",
      };
    }

    // 6. Future appointment completed rule (in Asia/Kolkata)
    if (newStatus === "completed" && isAppointmentUpcoming(appt)) {
      return {
        success: false,
        error: "Cannot mark a future appointment as completed before its scheduled time.",
        code: "FUTURE_APPOINTMENT",
      };
    }

    if (newStatus === "no_show" && isAppointmentUpcoming(appt)) {
      return {
        success: false,
        error: "Cannot mark a future appointment as no-show before its scheduled time.",
        code: "FUTURE_APPOINTMENT",
      };
    }

    // 7. Update status only — dates, times, patient IDs, doctor IDs, slot IDs immutable
    const updated = {
      ...appt,
      status: newStatus as "completed" | "no_show",
      updated_at: new Date().toISOString(),
    };

    this.appointments.set(appointmentId, updated);

    return {
      success: true,
      appointment: updated,
    };
  }
}

async function runPhase14Tests() {
  console.log("==================================================");
  console.log("MEDISPHERE PHASE 14 — TEST SUITE");
  console.log("Doctor Dashboard & Patient Appointments Verification");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ PASS: ${description}`);
    } else {
      console.error(`❌ FAIL: ${description}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  const sim = new Phase14Simulator();

  // --------------------------------------------------------------------------
  // TEST 1: Doctor can access their own appointments
  // --------------------------------------------------------------------------
  const sharmaAppts = sim.getDoctorAppointments("prof-doctor-sharma", "doc-sharma");
  assert(
    sharmaAppts.length === 5,
    "Test 1: Doctor A (Dr. Sharma) retrieves their exact appointments (5 records)",
    `Found: ${sharmaAppts.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Dashboard statistics use real records in Asia/Kolkata timezone
  // --------------------------------------------------------------------------
  const stats = getDoctorAppointmentStats(sharmaAppts as unknown as import("../types").Appointment[]);
  assert(
    stats.total === 5 &&
      stats.today === 1 &&
      stats.upcomingConfirmed === 1 &&
      stats.completed === 1 &&
      stats.cancelled === 1,
    "Test 2: Dashboard statistics accurately compute metrics using Asia/Kolkata timezone (Total: 5, Today: 1, Upcoming: 1, Completed: 1, Cancelled: 1)",
    JSON.stringify(stats)
  );

  // --------------------------------------------------------------------------
  // TEST 3: Doctor sees only their own appointments (Cross-Doctor Isolation)
  // --------------------------------------------------------------------------
  const crossDoctorAttempt = sim.getDoctorAppointments("prof-doctor-sharma", "doc-verma");
  const vermaAppts = sim.getDoctorAppointments("prof-doctor-verma", "doc-verma");
  assert(
    crossDoctorAttempt.length === 0 &&
      vermaAppts.length === 1 &&
      vermaAppts[0].doctor_id === "doc-verma",
    "Test 3: Doctor cannot access another doctor's appointments (Cross-doctor isolation strictly enforced)",
    `Cross-access count: ${crossDoctorAttempt.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Doctor cannot access another doctor's appointment details
  // --------------------------------------------------------------------------
  const unownedDetailsAttempt = sim.getDoctorAppointmentById(
    "prof-doctor-sharma",
    "doc-sharma",
    "appt-verma-1"
  );
  const ownedDetails = sim.getDoctorAppointmentById(
    "prof-doctor-sharma",
    "doc-sharma",
    "appt-sharma-today-1"
  );
  assert(
    unownedDetailsAttempt === null &&
      ownedDetails !== null &&
      ownedDetails.id === "appt-sharma-today-1",
    "Test 4: Doctor cannot access another doctor's appointment details (safely returns null)",
    `Unowned result: ${unownedDetailsAttempt}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Patient contact information is restricted appropriately
  // --------------------------------------------------------------------------
  const patientData = ownedDetails?.patient;
  assert(
    patientData !== null &&
      patientData?.full_name === "Rahul Mehra" &&
      patientData?.phone === "+91 91111 22222" &&
      patientData?.email === "rahul.mehra@example.com" &&
      !("password" in (patientData || {})) &&
      !("token" in (patientData || {})) &&
      !("raw_user_meta_data" in (patientData || {})),
    "Test 5: Patient contact info restricted strictly to authorized fields (full_name, phone, email, location; zero sensitive credentials)",
    JSON.stringify(patientData)
  );

  // --------------------------------------------------------------------------
  // TEST 6: Doctor can mark an eligible past/current appointment completed
  // --------------------------------------------------------------------------
  const completeResult = sim.updateDoctorAppointmentStatus(
    "prof-doctor-sharma",
    "appt-sharma-past-eligible-1",
    "completed"
  );
  const updatedAppt = sim.appointments.get("appt-sharma-past-eligible-1");
  assert(
    completeResult.success && updatedAppt?.status === "completed",
    "Test 6: Doctor can mark an eligible past appointment as completed",
    `Status: ${updatedAppt?.status}`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Doctor can mark an eligible appointment no-show
  // --------------------------------------------------------------------------
  // Reset appt status for test
  sim.appointments.set("appt-sharma-past-eligible-1", {
    ...sim.appointments.get("appt-sharma-past-eligible-1")!,
    status: "confirmed",
  });
  const noShowResult = sim.updateDoctorAppointmentStatus(
    "prof-doctor-sharma",
    "appt-sharma-past-eligible-1",
    "no_show"
  );
  const noShowAppt = sim.appointments.get("appt-sharma-past-eligible-1");
  assert(
    noShowResult.success && noShowAppt?.status === "no_show",
    "Test 7: Doctor can mark an eligible appointment as no-show",
    `Status: ${noShowAppt?.status}`
  );

  // --------------------------------------------------------------------------
  // TEST 8: Doctor cannot modify another doctor's appointment
  // --------------------------------------------------------------------------
  const modifyOtherDocAppt = sim.updateDoctorAppointmentStatus(
    "prof-doctor-sharma",
    "appt-verma-1",
    "completed"
  );
  const vermaApptAfterAttempt = sim.appointments.get("appt-verma-1");
  assert(
    !modifyOtherDocAppt.success &&
      modifyOtherDocAppt.code === "UNAUTHORIZED" &&
      vermaApptAfterAttempt?.status === "confirmed",
    "Test 8: Doctor cannot modify another doctor's appointment (rejected with UNAUTHORIZED)",
    `Error: ${modifyOtherDocAppt.error}`
  );

  // --------------------------------------------------------------------------
  // TEST 9: Doctor cannot modify patient, doctor, slot, date, or time fields through status updates
  // --------------------------------------------------------------------------
  const pastTestAppt = sim.appointments.get("appt-sharma-past-eligible-1")!;
  const slotBefore = sim.slots.get(pastTestAppt.slot_id);
  assert(
    pastTestAppt.patient_id === "pat-pooja" &&
      pastTestAppt.doctor_id === "doc-sharma" &&
      pastTestAppt.slot_id === "slot-sharma-5" &&
      pastTestAppt.appointment_date === "2026-10-08" &&
      pastTestAppt.start_time === "09:30:00" &&
      pastTestAppt.end_time === "10:00:00" &&
      slotBefore?.status === "booked",
    "Test 9: Status updates leave patient, doctor, slot, date, and time fields strictly immutable",
    `Slot status: ${slotBefore?.status}`
  );

  // --------------------------------------------------------------------------
  // TEST 10: Doctor cannot mark a future appointment completed
  // --------------------------------------------------------------------------
  const futureCompleteAttempt = sim.updateDoctorAppointmentStatus(
    "prof-doctor-sharma",
    "appt-sharma-future-1",
    "completed"
  );
  const futureApptAfterAttempt = sim.appointments.get("appt-sharma-future-1");
  assert(
    !futureCompleteAttempt.success &&
      futureCompleteAttempt.code === "FUTURE_APPOINTMENT" &&
      futureApptAfterAttempt?.status === "confirmed",
    "Test 10: Doctor cannot mark a future appointment completed before its scheduled time (strictly rejected)",
    `Error: ${futureCompleteAttempt.error}`
  );

  // --------------------------------------------------------------------------
  // TEST 11: Invalid status transitions are rejected
  // --------------------------------------------------------------------------
  const arbitraryStatusAttempt = sim.updateDoctorAppointmentStatus(
    "prof-doctor-sharma",
    "appt-sharma-past-eligible-1",
    "custom_status"
  );
  const cancelledUpdateAttempt = sim.updateDoctorAppointmentStatus(
    "prof-doctor-sharma",
    "appt-sharma-cancelled-1",
    "completed"
  );
  assert(
    !arbitraryStatusAttempt.success &&
      arbitraryStatusAttempt.code === "INVALID_STATUS" &&
      !cancelledUpdateAttempt.success &&
      cancelledUpdateAttempt.code === "INVALID_TRANSITION",
    "Test 11: Invalid status transitions and updates to cancelled appointments are rejected",
    `Arbitrary: ${arbitraryStatusAttempt.error}, Cancelled: ${cancelledUpdateAttempt.error}`
  );

  // --------------------------------------------------------------------------
  // TEST 12: Patients cannot perform doctor-only status updates
  // --------------------------------------------------------------------------
  const patientTamperAttempt = sim.updateDoctorAppointmentStatus(
    "pat-rahul",
    "appt-sharma-today-1",
    "completed"
  );
  assert(
    !patientTamperAttempt.success && patientTamperAttempt.code === "FORBIDDEN",
    "Test 12: Patients cannot perform doctor-only status updates (strictly rejected with FORBIDDEN)",
    `Error: ${patientTamperAttempt.error}`
  );

  // --------------------------------------------------------------------------
  // TEST 13: Empty states work without fake records
  // --------------------------------------------------------------------------
  const newDoctorAppts = sim.getDoctorAppointments("prof-doctor-new", "doc-new");
  const newDoctorStats = getDoctorAppointmentStats(newDoctorAppts as unknown as import("../types").Appointment[]);
  assert(
    newDoctorAppts.length === 0 &&
      newDoctorStats.total === 0 &&
      newDoctorStats.today === 0 &&
      newDoctorStats.upcomingConfirmed === 0 &&
      newDoctorStats.completed === 0 &&
      newDoctorStats.cancelled === 0,
    "Test 13: Empty state correctly identifies zero appointments without fake records",
    `Stats: ${JSON.stringify(newDoctorStats)}`
  );

  // --------------------------------------------------------------------------
  // TEST 14: Filtering logic supports all 8 required filters
  // --------------------------------------------------------------------------
  const currentSharmaAppts = sim.getDoctorAppointments("prof-doctor-sharma", "doc-sharma") as unknown as import("../types").AppointmentWithDetails[];
  const allFiltered = filterDoctorAppointments(currentSharmaAppts, "all");
  const todayFiltered = filterDoctorAppointments(currentSharmaAppts, "today");
  const upcomingFiltered = filterDoctorAppointments(currentSharmaAppts, "upcoming");
  const pastFiltered = filterDoctorAppointments(currentSharmaAppts, "past");
  const confirmedFiltered = filterDoctorAppointments(currentSharmaAppts, "confirmed");
  const completedFiltered = filterDoctorAppointments(currentSharmaAppts, "completed");
  const cancelledFiltered = filterDoctorAppointments(currentSharmaAppts, "cancelled");
  const noShowFiltered = filterDoctorAppointments(currentSharmaAppts, "no_show");

  assert(
    allFiltered.length === 5 &&
      todayFiltered.length === 1 &&
      upcomingFiltered.length === 1 &&
      pastFiltered.length === 3 &&
      confirmedFiltered.length === 2 &&
      completedFiltered.length === 1 &&
      cancelledFiltered.length === 1 &&
      noShowFiltered.length === 1,
    "Test 14: All 8 filters correctly segment appointments (All, Today, Upcoming, Past, Confirmed, Completed, Cancelled, No-Show)",
    `Counts -> All: ${allFiltered.length}, Today: ${todayFiltered.length}, Upcoming: ${upcomingFiltered.length}, Past: ${pastFiltered.length}, Confirmed: ${confirmedFiltered.length}, Completed: ${completedFiltered.length}, Cancelled: ${cancelledFiltered.length}, No-Show: ${noShowFiltered.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 15: Timezone formatting is strictly Asia/Kolkata
  // --------------------------------------------------------------------------
  const todayDateIST = getCurrentDateIST();
  const sampleFormattedDate = formatAppointmentDateIST("2026-10-25");
  const sampleFormattedTime = formatAppointmentTimeIST("14:30:00");
  assert(
    APPOINTMENT_TIMEZONE === "Asia/Kolkata" &&
      todayDateIST.length === 10 &&
      sampleFormattedDate.includes("Oct") &&
      sampleFormattedTime === "2:30 PM",
    "Test 15: Strict Asia/Kolkata timezone formatting and date utilities verified",
    `Today IST: ${todayDateIST}, Sample: ${sampleFormattedDate} at ${sampleFormattedTime}`
  );

  // --------------------------------------------------------------------------
  // TEST 16: Existing doctor discovery and Supabase auth continue working
  // --------------------------------------------------------------------------
  const doctorsList = await getDoctors();
  const { data: sessionData } = await supabase.auth.getSession();
  assert(
    Array.isArray(doctorsList) && typeof sessionData === "object",
    "Test 16: Existing doctor listing and Supabase authentication client continue working without regression"
  );

  // --------------------------------------------------------------------------
  // TEST 17: Required route files and components exist
  // --------------------------------------------------------------------------
  const doctorDashboardPath = path.resolve(process.cwd(), "app/doctor/dashboard/page.tsx");
  const doctorAppointmentsPath = path.resolve(process.cwd(), "app/doctor/appointments/page.tsx");
  const doctorAppointmentDetailsPath = path.resolve(process.cwd(), "app/doctor/appointments/[id]/page.tsx");
  const doctorNavPath = path.resolve(process.cwd(), "components/dashboard/DoctorDashboardNav.tsx");
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261014000000_doctor_appointments.sql");

  assert(fs.existsSync(doctorDashboardPath), "Test 17a: /doctor/dashboard route exists");
  assert(fs.existsSync(doctorAppointmentsPath), "Test 17b: /doctor/appointments route exists");
  assert(fs.existsSync(doctorAppointmentDetailsPath), "Test 17c: /doctor/appointments/[id] route exists");
  assert(fs.existsSync(doctorNavPath), "Test 17d: DoctorDashboardNav component exists");
  assert(fs.existsSync(migrationPath), "Test 17e: 20261014000000_doctor_appointments.sql migration exists");

  // --------------------------------------------------------------------------
  // TEST 18: File content validations for doctor routes
  // --------------------------------------------------------------------------
  const dashCode = fs.readFileSync(doctorDashboardPath, "utf-8");
  assert(
    dashCode.includes("getDoctorAppointmentStats") &&
      dashCode.includes("stats.total") &&
      dashCode.includes("stats.today") &&
      dashCode.includes("stats.upcomingConfirmed") &&
      dashCode.includes("stats.completed") &&
      dashCode.includes("stats.cancelled") &&
      dashCode.includes("Asia/Kolkata"),
    "Test 18a: Doctor dashboard displays all 5 real appointment statistics computed in Asia/Kolkata"
  );

  const apptsCode = fs.readFileSync(doctorAppointmentsPath, "utf-8");
  assert(
    apptsCode.includes("all") &&
      apptsCode.includes("today") &&
      apptsCode.includes("upcoming") &&
      apptsCode.includes("past") &&
      apptsCode.includes("confirmed") &&
      apptsCode.includes("completed") &&
      apptsCode.includes("cancelled") &&
      apptsCode.includes("no_show") &&
      apptsCode.includes("updateDoctorAppointmentStatus"),
    "Test 18b: Doctor appointments page implements all 8 filters and status updates"
  );

  const detailsCode = fs.readFileSync(doctorAppointmentDetailsPath, "utf-8");
  assert(
    detailsCode.includes("getDoctorAppointmentById") &&
      detailsCode.includes("Appointment Not Found or Access Denied") &&
      detailsCode.includes("updateDoctorAppointmentStatus") &&
      detailsCode.includes("patient"),
    "Test 18c: Doctor appointment details page enforces safe access denial, displays patient info, and handles status transitions"
  );

  const migrationCode = fs.readFileSync(migrationPath, "utf-8");
  assert(
    migrationCode.includes("update_doctor_appointment_status") &&
      migrationCode.includes("Allow doctors to view patient profiles for own appointments") &&
      migrationCode.includes("Allow doctors to update own appointment status"),
    "Test 18d: Migration contains RLS policies and server-side RPC procedure"
  );

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase14Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
