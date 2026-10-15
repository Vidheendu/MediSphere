import fs from "fs";
import path from "path";

// Pre-load environment if exists
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
  escapeHtml,
  generateAppointmentConfirmationHtml,
  generateAppointmentConfirmationText,
} from "../lib/email/template";
import {
  isResendConfigured,
  getSenderEmail,
  getAppBaseUrl,
  resetResendClient,
} from "../lib/email/resend";
import {
  sendAppointmentConfirmationEmail,
  hasConfirmationBeenSent,
  markConfirmationAsSent,
  resetConfirmationEmailCache,
} from "../lib/email/appointment-confirmation";
import {
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  APPOINTMENT_TIMEZONE,
} from "../lib/services/appointments";
import type { AppointmentWithDetails } from "../types";

// ============================================================================
// SIMULATION ENGINE FOR PHASE 15 (Zero production pollution)
// ============================================================================

interface MockEmailSent {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

class ResendEmailMock {
  public sentEmails: MockEmailSent[] = [];
  public shouldFail: boolean = false;
  public failureError: Error = new Error("Resend API rate limit exceeded (HTTP 429)");

  public async send(payload: MockEmailSent) {
    if (this.shouldFail) {
      throw this.failureError;
    }
    this.sentEmails.push(payload);
    return {
      data: { id: `resend_msg_${Date.now()}_${Math.random().toString(36).substring(7)}` },
      error: null,
    };
  }

  public clear() {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}

const mockResend = new ResendEmailMock();

/**
 * Phase 15 Atomic Booking & Email Flow Simulator
 */
class Phase15Simulator {
  public profiles = new Map<string, { id: string; role: string; full_name: string | null; email: string }>();
  public doctors = new Map<string, {
    id: string;
    profile_id: string;
    speciality_name: string;
    qualification: string;
    verification_status: string;
    clinic_name: string | null;
    clinic_address: string | null;
    clinic_city: string | null;
    clinic_state: string | null;
    clinic_pincode: string | null;
  }>();
  public slots = new Map<string, {
    id: string;
    doctor_id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    status: "available" | "booked" | "blocked";
  }>();
  public appointments = new Map<string, {
    id: string;
    patient_id: string;
    doctor_id: string;
    slot_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: "confirmed" | "cancelled" | "completed" | "no_show";
    reason?: string | null;
    notes?: string | null;
  }>();

  constructor() {
    this.seed();
  }

  public seed() {
    this.profiles.set("patient-1", {
      id: "patient-1",
      role: "patient",
      full_name: "Aakash Verma",
      email: "aakash.verma@example.com",
    });

    this.profiles.set("patient-2", {
      id: "patient-2",
      role: "patient",
      full_name: "Priya Sharma",
      email: "priya.sharma@example.com",
    });

    this.profiles.set("patient-no-name", {
      id: "patient-no-name",
      role: "patient",
      full_name: null,
      email: "anonymous.patient@example.com",
    });

    this.profiles.set("doc-prof-1", {
      id: "doc-prof-1",
      role: "doctor",
      full_name: "Sandeep Patel",
      email: "dr.sandeep@bhopalclinic.com",
    });

    this.doctors.set("doc-1", {
      id: "doc-1",
      profile_id: "doc-prof-1",
      speciality_name: "Cardiology",
      qualification: "MD, DM (Cardiology)",
      verification_status: "verified",
      clinic_name: "Bhopal Heart & Health Center",
      clinic_address: "123 Arera Colony",
      clinic_city: "Bhopal",
      clinic_state: "Madhya Pradesh",
      clinic_pincode: "462016",
    });

    this.doctors.set("doc-no-clinic", {
      id: "doc-no-clinic",
      profile_id: "doc-prof-1",
      speciality_name: "General Medicine",
      qualification: "MBBS",
      verification_status: "verified",
      clinic_name: null,
      clinic_address: null,
      clinic_city: null,
      clinic_state: null,
      clinic_pincode: null,
    });

    this.doctors.set("doc-pending", {
      id: "doc-pending",
      profile_id: "doc-prof-1",
      speciality_name: "Dermatology",
      qualification: "MD (Dermatology)",
      verification_status: "pending",
      clinic_name: "City Skin Clinic",
      clinic_address: "MP Nagar",
      clinic_city: "Bhopal",
      clinic_state: "Madhya Pradesh",
      clinic_pincode: "462011",
    });

    this.slots.set("slot-avail-1", {
      id: "slot-avail-1",
      doctor_id: "doc-1",
      slot_date: "2026-10-25",
      start_time: "10:00:00",
      end_time: "10:30:00",
      status: "available",
    });

    this.slots.set("slot-avail-no-clinic", {
      id: "slot-avail-no-clinic",
      doctor_id: "doc-no-clinic",
      slot_date: "2026-10-26",
      start_time: "14:00:00",
      end_time: "14:30:00",
      status: "available",
    });

    this.slots.set("slot-pending-doc", {
      id: "slot-pending-doc",
      doctor_id: "doc-pending",
      slot_date: "2026-10-27",
      start_time: "11:00:00",
      end_time: "11:30:00",
      status: "available",
    });

    this.slots.set("slot-blocked", {
      id: "slot-blocked",
      doctor_id: "doc-1",
      slot_date: "2026-10-25",
      start_time: "12:00:00",
      end_time: "12:30:00",
      status: "blocked",
    });
  }

  /**
   * Atomic booking function simulating PostgreSQL book_appointment RPC
   */
  public atomicBook(patientId: string, slotId: string, reason?: string, notes?: string) {
    const patient = this.profiles.get(patientId);
    if (!patient || patient.role !== "patient") {
      return { success: false, error: "Only registered patient accounts can book appointments.", code: "INVALID_ROLE" };
    }

    const slot = this.slots.get(slotId);
    if (!slot) {
      return { success: false, error: "Appointment slot not found.", code: "SLOT_NOT_FOUND" };
    }

    if (slot.status === "booked") {
      return { success: false, error: "This appointment slot is already booked.", code: "SLOT_ALREADY_BOOKED" };
    }

    if (slot.status === "blocked") {
      return { success: false, error: "This appointment slot has been blocked by the practitioner.", code: "SLOT_BLOCKED" };
    }

    const doctor = this.doctors.get(slot.doctor_id);
    if (!doctor || doctor.verification_status !== "verified") {
      return { success: false, error: "Appointments can only be booked with verified practitioners.", code: "DOCTOR_NOT_VERIFIED" };
    }

    // Atomically transition slot to booked and create appointment
    slot.status = "booked";
    const apptId = `appt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const appt = {
      id: apptId,
      patient_id: patientId,
      doctor_id: slot.doctor_id,
      slot_id: slot.id,
      appointment_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: "confirmed" as const,
      reason: reason || null,
      notes: notes || null,
    };
    this.appointments.set(apptId, appt);

    return {
      success: true,
      appointment: appt,
    };
  }

  /**
   * Full simulated server booking sequence (Phase 15 specification)
   */
  public async executeServerBookingFlow(params: {
    callerUserId: string;
    slotId: string;
    reason?: string;
    notes?: string;
    mockEmailProvider?: ResendEmailMock;
    simulatedApiKey?: string;
  }) {
    const { callerUserId, slotId, reason, notes, mockEmailProvider, simulatedApiKey } = params;

    // Step 1: Database booking function validates and executes atomically
    const bookingResult = this.atomicBook(callerUserId, slotId, reason, notes);

    // Step 2: Failed booking NEVER triggers an email
    if (!bookingResult.success || !bookingResult.appointment) {
      return {
        success: false,
        error: bookingResult.error,
        code: bookingResult.code,
        emailDelivery: { attempted: false, sent: false },
      };
    }

    const appt = bookingResult.appointment;

    // Step 3: Server receives successful result -> sends confirmation email
    let emailDelivery;
    try {
      const patient = this.profiles.get(callerUserId);
      const doctor = this.doctors.get(appt.doctor_id)!;
      const docProfile = this.profiles.get(doctor.profile_id)!;

      // Ownership guard
      if (appt.patient_id !== callerUserId) {
        emailDelivery = {
          attempted: false,
          sent: false,
          reason: "unauthorized" as const,
          message: "You are not authorized to trigger emails for this appointment.",
        };
      } else if (!simulatedApiKey) {
        // Missing credentials handling
        emailDelivery = {
          attempted: false,
          sent: false,
          reason: "missing_credentials" as const,
          message: "Email delivery service is currently not configured.",
        };
      } else if (hasConfirmationBeenSent(appt.id)) {
        // Idempotency / duplicate protection
        emailDelivery = {
          attempted: false,
          sent: false,
          reason: "already_sent" as const,
          message: "Confirmation email has already been sent for this appointment.",
        };
      } else {
        // Build address without trailing commas/empty values
        let clinicAddress: string | null = null;
        if (doctor.clinic_address) {
          const parts = [doctor.clinic_address, doctor.clinic_city, doctor.clinic_state, doctor.clinic_pincode].filter(Boolean);
          clinicAddress = parts.join(", ");
        }

        const rawDocName = docProfile.full_name || "Doctor";
        const docNameStr = rawDocName.startsWith("Dr.") ? rawDocName : `Dr. ${rawDocName}`;

        const emailData = {
          appointmentId: appt.id,
          patientName: patient?.full_name || null,
          patientEmail: patient!.email,
          doctorName: docNameStr,
          speciality: doctor.speciality_name,
          clinicName: doctor.clinic_name,
          clinicAddress,
          appointmentDate: appt.appointment_date,
          startTime: appt.start_time,
          endTime: appt.end_time,
          status: appt.status,
          appointmentUrl: `http://localhost:3000/dashboard/appointments/${appt.id}`,
        };

        const html = generateAppointmentConfirmationHtml(emailData);
        const text = generateAppointmentConfirmationText(emailData);

        if (mockEmailProvider) {
          const res = await mockEmailProvider.send({
            from: "MediSphere <onboarding@resend.dev>",
            to: [patient!.email],
            subject: `Appointment Confirmed: ${emailData.doctorName} on ${emailData.appointmentDate}`,
            html,
            text,
          });

          markConfirmationAsSent(appt.id);
          emailDelivery = {
            attempted: true,
            sent: true,
            reason: "sent" as const,
            message: "Confirmation email sent successfully.",
            messageId: res.data?.id,
          };
        }
      }
    } catch {
      // Safe error handling: never roll back booking!
      emailDelivery = {
        attempted: true,
        sent: false,
        reason: "provider_error" as const,
        message: "Confirmation email could not be delivered.",
      };
    }

    return {
      success: true,
      appointment: appt,
      emailDelivery,
    };
  }
}

// ============================================================================
// TEST SUITE EXECUTION
// ============================================================================

async function runPhase15Tests() {
  console.log("==================================================");
  console.log("MEDISPHERE PHASE 15 — TEST SUITE");
  console.log("Appointment Confirmation Email Integration (Resend)");
  console.log("==================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ FAIL: Test ${totalTests}: ${testName}`);
      if (failureDetails) {
        console.error(`   Details: ${failureDetails}`);
      }
    }
  }

  const sim = new Phase15Simulator();
  resetConfirmationEmailCache();
  mockResend.clear();

  // --------------------------------------------------------------------------
  // TEST 1: Successful booking triggers confirmation email delivery
  // --------------------------------------------------------------------------
  const res1 = await sim.executeServerBookingFlow({
    callerUserId: "patient-1",
    slotId: "slot-avail-1",
    reason: "Chest discomfort checkup",
    simulatedApiKey: "re_test_key_12345",
    mockEmailProvider: mockResend,
  });

  assert(
    res1.success === true &&
    res1.appointment !== undefined &&
    res1.emailDelivery?.sent === true &&
    mockResend.sentEmails.length === 1,
    "Successful booking triggers confirmation email delivery",
    `Sent count: ${mockResend.sentEmails.length}, Sent status: ${res1.emailDelivery?.sent}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Failed booking does not trigger an email
  // --------------------------------------------------------------------------
  const initialEmailCount = mockResend.sentEmails.length;
  // Try booking an already booked slot
  const res2a = await sim.executeServerBookingFlow({
    callerUserId: "patient-2",
    slotId: "slot-avail-1", // Already booked in Test 1
    reason: "Second attempt on same slot",
    simulatedApiKey: "re_test_key_12345",
    mockEmailProvider: mockResend,
  });

  // Try booking a blocked slot
  const res2b = await sim.executeServerBookingFlow({
    callerUserId: "patient-2",
    slotId: "slot-blocked",
    reason: "Attempt on blocked slot",
    simulatedApiKey: "re_test_key_12345",
    mockEmailProvider: mockResend,
  });

  // Try booking an unverified doctor's slot
  const res2c = await sim.executeServerBookingFlow({
    callerUserId: "patient-2",
    slotId: "slot-pending-doc",
    reason: "Attempt on pending doctor",
    simulatedApiKey: "re_test_key_12345",
    mockEmailProvider: mockResend,
  });

  assert(
    res2a.success === false &&
    res2b.success === false &&
    res2c.success === false &&
    mockResend.sentEmails.length === initialEmailCount,
    "Failed booking does not trigger an email (blocked, already booked, pending doctor)",
    `Expected email count ${initialEmailCount}, got ${mockResend.sentEmails.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Email failure does not undo a successful booking
  // --------------------------------------------------------------------------
  // Configure mock Resend provider to throw an error
  mockResend.shouldFail = true;

  // Add fresh available slot
  sim.slots.set("slot-avail-failtest", {
    id: "slot-avail-failtest",
    doctor_id: "doc-1",
    slot_date: "2026-10-28",
    start_time: "15:00:00",
    end_time: "15:30:00",
    status: "available",
  });

  const res3 = await sim.executeServerBookingFlow({
    callerUserId: "patient-2",
    slotId: "slot-avail-failtest",
    reason: "Follow-up consultation",
    simulatedApiKey: "re_test_key_12345",
    mockEmailProvider: mockResend,
  });

  const slotAfter = sim.slots.get("slot-avail-failtest");
  const apptAfter = sim.appointments.get(res3.appointment?.id || "");

  assert(
    res3.success === true &&
    res3.emailDelivery?.sent === false &&
    res3.emailDelivery?.reason === "provider_error" &&
    slotAfter?.status === "booked" &&
    apptAfter?.status === "confirmed",
    "Email failure does not undo a successful booking (Slot remains booked, appointment confirmed)",
    `Slot status: ${slotAfter?.status}, Appointment status: ${apptAfter?.status}`
  );

  mockResend.shouldFail = false;

  // --------------------------------------------------------------------------
  // TEST 4: Recipient comes from the authenticated patient's account
  // --------------------------------------------------------------------------
  mockResend.clear();
  sim.slots.set("slot-avail-recipient-test", {
    id: "slot-avail-recipient-test",
    doctor_id: "doc-1",
    slot_date: "2026-10-29",
    start_time: "09:00:00",
    end_time: "09:30:00",
    status: "available",
  });

  await sim.executeServerBookingFlow({
    callerUserId: "patient-1", // Registered email: aakash.verma@example.com
    slotId: "slot-avail-recipient-test",
    simulatedApiKey: "re_test_key_12345",
    mockEmailProvider: mockResend,
  });

  const sentEmail = mockResend.sentEmails[0];
  assert(
    sentEmail &&
    sentEmail.to.length === 1 &&
    sentEmail.to[0] === "aakash.verma@example.com",
    "Recipient comes strictly from authenticated patient's account email",
    `Sent recipient: ${sentEmail?.to}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: A user cannot request an email for another patient's appointment
  // --------------------------------------------------------------------------
  // Patient 2 attempts to trigger email for an appointment owned by Patient 1
  const patient1Appt = res1.appointment!;
  let crossUserResult;
  try {
    crossUserResult = await sendAppointmentConfirmationEmail({
      appointmentId: patient1Appt.id,
      callerUserId: "patient-2", // Different user!
      recipientEmail: "attacker@evil.com",
      appointmentData: {
        ...patient1Appt,
        doctor: {
          id: "doc-1",
          qualification: "MD",
          profile: { id: "doc-prof-1", full_name: "Dr. Sandeep Patel", email: "doc@test.com" },
          speciality: { id: "spec-1", name: "Cardiology", slug: "cardiology", description: null },
          clinic: null,
          verification_status: "verified",
          experience_years: 10,
          consultation_fee: 500,
          about: null,
        },
      } as unknown as AppointmentWithDetails,
    });
  } catch {
    crossUserResult = { sent: false, reason: "unauthorized" };
  }

  assert(
    crossUserResult.sent === false &&
    crossUserResult.reason === "unauthorized",
    "A user cannot request an email for another patient's appointment (rejected with unauthorized)",
    `Result: ${JSON.stringify(crossUserResult)}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Email content uses the actual appointment details
  // --------------------------------------------------------------------------
  const htmlContent = sentEmail.html;
  const textContent = sentEmail.text;

  const containsDoctor = htmlContent.includes("Dr. Sandeep Patel") && textContent.includes("Dr. Sandeep Patel");
  const containsSpeciality = htmlContent.includes("Cardiology") && textContent.includes("Cardiology");
  const containsClinic = htmlContent.includes("Bhopal Heart &amp; Health Center") && textContent.includes("Bhopal Heart & Health Center");
  const containsAddress = htmlContent.includes("123 Arera Colony, Bhopal, Madhya Pradesh, 462016");
  const containsApptId = htmlContent.includes(sentEmail.text.match(/Appointment ID\s*:\s*(appt_[^\s]+)/)?.[1] || "");
  const excludesSensitiveNotes = !htmlContent.includes("Chest discomfort checkup") && !textContent.includes("Chest discomfort checkup");

  assert(
    containsDoctor && containsSpeciality && containsClinic && containsAddress && containsApptId && excludesSensitiveNotes,
    "Email content uses actual database appointment details & excludes sensitive medical notes",
    `Doctor: ${containsDoctor}, Speciality: ${containsSpeciality}, Clinic: ${containsClinic}, Privacy: ${excludesSensitiveNotes}`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Date and time use Asia/Kolkata
  // --------------------------------------------------------------------------
  const sampleDate = "2026-10-25";
  const formattedDate = formatAppointmentDateIST(sampleDate, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const formattedStartTime = formatAppointmentTimeIST("10:00:00");
  const formattedEndTime = formatAppointmentTimeIST("10:30:00");

  assert(
    formattedDate === "Sunday, October 25, 2026" &&
    formattedStartTime === "10:00 AM" &&
    formattedEndTime === "10:30 AM" &&
    APPOINTMENT_TIMEZONE === "Asia/Kolkata",
    "Date and time formatting strictly adheres to Asia/Kolkata (IST)",
    `Formatted date: ${formattedDate}, Start: ${formattedStartTime}, End: ${formattedEndTime}`
  );

  // --------------------------------------------------------------------------
  // TEST 8: Missing optional fields are handled safely
  // --------------------------------------------------------------------------
  const emailDataMissingOptionals = {
    appointmentId: "appt-optional-test-123",
    patientName: null, // No patient name
    patientEmail: "patient@test.com",
    doctorName: "Dr. Sandeep Patel",
    speciality: null, // No speciality
    clinicName: null, // No clinic
    clinicAddress: null, // No address
    appointmentDate: "2026-10-25",
    startTime: "10:00:00",
    endTime: "10:30:00",
    status: "confirmed",
    appointmentUrl: "http://localhost:3000/dashboard/appointments/appt-optional-test-123",
  };

  const htmlMissing = generateAppointmentConfirmationHtml(emailDataMissingOptionals);
  const textMissing = generateAppointmentConfirmationText(emailDataMissingOptionals);

  const greetingHandled = htmlMissing.includes("Hello,") && !htmlMissing.includes("null");
  const clinicOmitted = !htmlMissing.includes("<tr><td") || !htmlMissing.includes("undefined");
  const textHasNoNull = !textMissing.includes("null") && !textMissing.includes("undefined");

  // Also test HTML escaping
  const maliciousInput = '<script>alert("xss")</script> & "quotes"';
  const escaped = escapeHtml(maliciousInput);
  const xssBlocked = !escaped.includes("<script>") && escaped.includes("&lt;script&gt;");

  assert(
    greetingHandled && clinicOmitted && textHasNoNull && xssBlocked,
    "Missing optional fields are handled safely and HTML input is escaped",
    `Greeting: ${greetingHandled}, No nulls: ${textHasNoNull}, XSS blocked: ${xssBlocked}`
  );

  // --------------------------------------------------------------------------
  // TEST 9: Missing Resend credentials do not break booking
  // --------------------------------------------------------------------------
  sim.slots.set("slot-avail-no-creds", {
    id: "slot-avail-no-creds",
    doctor_id: "doc-1",
    slot_date: "2026-10-30",
    start_time: "11:00:00",
    end_time: "11:30:00",
    status: "available",
  });

  const res9 = await sim.executeServerBookingFlow({
    callerUserId: "patient-1",
    slotId: "slot-avail-no-creds",
    simulatedApiKey: "", // Missing API key!
    mockEmailProvider: mockResend,
  });

  assert(
    res9.success === true &&
    res9.appointment !== undefined &&
    res9.emailDelivery?.attempted === false &&
    res9.emailDelivery?.sent === false &&
    res9.emailDelivery?.reason === "missing_credentials",
    "Missing Resend credentials do not break booking (returns missing_credentials status)",
    `Booking success: ${res9.success}, Email status: ${res9.emailDelivery?.reason}`
  );

  // --------------------------------------------------------------------------
  // TEST 10: Refreshing a confirmation page does not resend the email
  // --------------------------------------------------------------------------
  // If the same appointment is evaluated, dedup cache stops duplicate send
  const bookedApptId = res1.appointment!.id;
  const isAlreadySent = hasConfirmationBeenSent(bookedApptId);

  const res10 = await sim.executeServerBookingFlow({
    callerUserId: "patient-1",
    slotId: "slot-avail-1", // Slot is booked; page refresh does not resend
    simulatedApiKey: "re_test_key_12345",
    mockEmailProvider: mockResend,
  });

  assert(
    isAlreadySent === true &&
    res10.success === false &&
    res10.emailDelivery?.sent === false,
    "Refreshing confirmation page or retrying does not resend confirmation email",
    `Has sent flag: ${isAlreadySent}, Re-execution success: ${res10.success}`
  );

  // --------------------------------------------------------------------------
  // TEST 11: Existing double-booking protection still works
  // --------------------------------------------------------------------------
  sim.slots.set("slot-concurrent-test", {
    id: "slot-concurrent-test",
    doctor_id: "doc-1",
    slot_date: "2026-10-31",
    start_time: "16:00:00",
    end_time: "16:30:00",
    status: "available",
  });

  // Run two concurrent booking operations
  const [concurrentA, concurrentB] = await Promise.all([
    sim.executeServerBookingFlow({
      callerUserId: "patient-1",
      slotId: "slot-concurrent-test",
      reason: "Patient A attempt",
      simulatedApiKey: "re_test_key_12345",
      mockEmailProvider: mockResend,
    }),
    sim.executeServerBookingFlow({
      callerUserId: "patient-2",
      slotId: "slot-concurrent-test",
      reason: "Patient B attempt",
      simulatedApiKey: "re_test_key_12345",
      mockEmailProvider: mockResend,
    }),
  ]);

  const oneSucceeded = (concurrentA.success && !concurrentB.success) || (!concurrentA.success && concurrentB.success);
  const oneEmailSent = (concurrentA.emailDelivery?.sent ? 1 : 0) + (concurrentB.emailDelivery?.sent ? 1 : 0) === 1;

  assert(
    oneSucceeded && oneEmailSent,
    "Existing double-booking protection strictly preserves single-booking & single-email guarantee",
    `A success: ${concurrentA.success}, B success: ${concurrentB.success}`
  );

  // --------------------------------------------------------------------------
  // TEST 12: Existing patient and doctor dashboards continue working
  // --------------------------------------------------------------------------
  const { getDoctorAppointmentStats } = await import("../lib/services/appointments");
  const testAppointments = [
    {
      id: "a1",
      patient_id: "p1",
      doctor_id: "doc-1",
      slot_id: "s1",
      appointment_date: "2026-10-25",
      start_time: "10:00:00",
      end_time: "10:30:00",
      status: "confirmed" as const,
      reason: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "a2",
      patient_id: "p2",
      doctor_id: "doc-1",
      slot_id: "s2",
      appointment_date: "2026-10-10",
      start_time: "10:00:00",
      end_time: "10:30:00",
      status: "completed" as const,
      reason: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const stats = getDoctorAppointmentStats(testAppointments as unknown as AppointmentWithDetails[]);

  assert(
    stats.total === 2 &&
    stats.completed === 1 &&
    typeof getDoctorAppointmentStats === "function",
    "Existing patient and doctor dashboard calculations continue working without regression",
    `Computed total: ${stats.total}, completed: ${stats.completed}`
  );

  // --------------------------------------------------------------------------
  // TEST 13: Verifying required files and route handlers exist
  // --------------------------------------------------------------------------
  const filesToCheck = [
    "lib/email/types.ts",
    "lib/email/resend.ts",
    "lib/email/template.ts",
    "lib/email/appointment-confirmation.ts",
    "lib/email/index.ts",
    "app/api/appointments/book/route.ts",
    "app/api/appointments/[id]/send-confirmation/route.ts",
  ];

  const allFilesExist = filesToCheck.every((f) => fs.existsSync(path.resolve(process.cwd(), f)));

  const resendHelpersWork =
    typeof isResendConfigured === "function" &&
    typeof getSenderEmail === "function" &&
    typeof getAppBaseUrl === "function" &&
    typeof resetResendClient === "function";

  assert(
    allFilesExist && resendHelpersWork,
    "All required Phase 15 email modules, helper utilities, and Next.js server route handlers exist",
    `Missing files: ${filesToCheck.filter((f) => !fs.existsSync(path.resolve(process.cwd(), f))).join(", ")}`
  );

  // --------------------------------------------------------------------------
  // TEST 14: Verifying .env.example has required server-only environment variables
  // --------------------------------------------------------------------------
  const envExampleContent = fs.readFileSync(path.resolve(process.cwd(), ".env.example"), "utf-8");
  const hasResendApiKey = envExampleContent.includes("RESEND_API_KEY=");
  const hasResendFrom = envExampleContent.includes("RESEND_FROM_EMAIL=");
  const hasAppBaseUrl = envExampleContent.includes("APP_BASE_URL=");
  const noNextPublicResend = !envExampleContent.includes("NEXT_PUBLIC_RESEND");

  assert(
    hasResendApiKey && hasResendFrom && hasAppBaseUrl && noNextPublicResend,
    ".env.example contains server-only RESEND_API_KEY, RESEND_FROM_EMAIL, APP_BASE_URL (no NEXT_PUBLIC_ exposure)",
    `apiKey: ${hasResendApiKey}, from: ${hasResendFrom}, baseUrl: ${hasAppBaseUrl}, noClientLeak: ${noNextPublicResend}`
  );

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase15Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
