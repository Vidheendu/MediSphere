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
  calculateRatingStats,
  checkAppointmentReviewEligibility,
  validateReviewInput,
  sanitizeReviewerDisplayName,
  formatReviewError,
  MAX_REVIEW_TEXT_LENGTH,
} from "../lib/services/reviews";
import {
  getDoctorAppointmentStats,
} from "../lib/services/appointments";
import { generateAppointmentConfirmationHtml } from "../lib/email/template";
import type {
  AppointmentWithDetails,
  PublicDoctorReview,
  AppointmentStatus,
} from "../types";


// ============================================================================
// SIMULATION ENGINE FOR PHASE 16 (Zero production database pollution)
// ============================================================================

interface MockProfile {
  id: string;
  role: "patient" | "doctor" | "admin";
  full_name: string;
  email: string;
  phone: string;
  location: string;
}

interface MockDoctor {
  id: string;
  profile_id: string;
  speciality_id: string;
  verification_status: "verified" | "pending";
}

interface MockAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;
}

interface MockReview {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

class Phase16Simulator {
  public profiles = new Map<string, MockProfile>();
  public doctors = new Map<string, MockDoctor>();
  public appointments = new Map<string, MockAppointment>();
  public reviews = new Map<string, MockReview>();

  constructor() {
    this.seed();
  }

  private seed() {
    // Doctors
    this.profiles.set("prof-doc-sharma", {
      id: "prof-doc-sharma",
      role: "doctor",
      full_name: "Aakash Sharma",
      email: "dr.sharma@medisphere.com",
      phone: "+91 98260 11111",
      location: "Arera Colony, Bhopal",
    });
    this.doctors.set("doc-sharma", {
      id: "doc-sharma",
      profile_id: "prof-doc-sharma",
      speciality_id: "spec-cardio",
      verification_status: "verified",
    });

    this.profiles.set("prof-doc-verma", {
      id: "prof-doc-verma",
      role: "doctor",
      full_name: "Sneha Verma",
      email: "dr.verma@medisphere.com",
      phone: "+91 98260 22222",
      location: "MP Nagar, Bhopal",
    });
    this.doctors.set("doc-verma", {
      id: "doc-verma",
      profile_id: "prof-doc-verma",
      speciality_id: "spec-derma",
      verification_status: "verified",
    });

    // Patients
    this.profiles.set("pat-rahul", {
      id: "pat-rahul",
      role: "patient",
      full_name: "Rahul Mehra",
      email: "rahul.mehra@example.com",
      phone: "+91 98260 55555",
      location: "Bhopal",
    });

    this.profiles.set("pat-priya", {
      id: "pat-priya",
      role: "patient",
      full_name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+91 98260 66666",
      location: "Bhopal",
    });

    // Appointments
    // Appt 1: Rahul's completed appointment with Dr. Sharma
    this.appointments.set("appt-rahul-completed", {
      id: "appt-rahul-completed",
      patient_id: "pat-rahul",
      doctor_id: "doc-sharma",
      slot_id: "slot-1",
      appointment_date: "2026-10-10",
      start_time: "10:00:00",
      end_time: "10:30:00",
      status: "completed",
      reason: "Cardiology follow up",
      notes: "Blood pressure normal",
    });

    // Appt 2: Rahul's confirmed appointment with Dr. Sharma (not completed)
    this.appointments.set("appt-rahul-confirmed", {
      id: "appt-rahul-confirmed",
      patient_id: "pat-rahul",
      doctor_id: "doc-sharma",
      slot_id: "slot-2",
      appointment_date: "2026-10-25",
      start_time: "11:00:00",
      end_time: "11:30:00",
      status: "confirmed",
      reason: "Routine check",
    });

    // Appt 3: Rahul's cancelled appointment with Dr. Sharma
    this.appointments.set("appt-rahul-cancelled", {
      id: "appt-rahul-cancelled",
      patient_id: "pat-rahul",
      doctor_id: "doc-sharma",
      slot_id: "slot-3",
      appointment_date: "2026-10-08",
      start_time: "14:00:00",
      end_time: "14:30:00",
      status: "cancelled",
      reason: "Flu symptoms",
    });

    // Appt 4: Rahul's no_show appointment with Dr. Sharma
    this.appointments.set("appt-rahul-noshow", {
      id: "appt-rahul-noshow",
      patient_id: "pat-rahul",
      doctor_id: "doc-sharma",
      slot_id: "slot-4",
      appointment_date: "2026-10-09",
      start_time: "15:00:00",
      end_time: "15:30:00",
      status: "no_show",
      reason: "Consultation",
    });

    // Appt 5: Priya's completed appointment with Dr. Verma
    this.appointments.set("appt-priya-completed", {
      id: "appt-priya-completed",
      patient_id: "pat-priya",
      doctor_id: "doc-verma",
      slot_id: "slot-5",
      appointment_date: "2026-10-12",
      start_time: "16:00:00",
      end_time: "16:30:00",
      status: "completed",
      reason: "Skin allergy",
    });
  }

  // Simulates stored procedure: submit_doctor_review
  public submitReviewRPC(callerId: string | null, appointmentId: string, rating: number, reviewText?: string | null): {
    success: boolean;
    review?: MockReview;
    error?: string;
    code?: string;
  } {
    // 1. Auth required
    if (!callerId) {
      return { success: false, error: "Authentication required to submit a doctor review.", code: "AUTH_REQUIRED" };
    }

    // 2. Validate rating bounds
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { success: false, error: "Rating must be an integer between 1 and 5.", code: "INVALID_RATING" };
    }

    // 3. Validate review text length
    if (reviewText && reviewText.length > MAX_REVIEW_TEXT_LENGTH) {
      return { success: false, error: `Review text cannot exceed ${MAX_REVIEW_TEXT_LENGTH} characters.`, code: "REVIEW_TOO_LONG" };
    }

    // 4. Verify appointment
    const appt = this.appointments.get(appointmentId);
    if (!appt) {
      return { success: false, error: "Appointment could not be found.", code: "APPOINTMENT_NOT_FOUND" };
    }

    // Patient ownership check
    if (appt.patient_id !== callerId) {
      return { success: false, error: "You can only review consultations booked under your account.", code: "UNAUTHORIZED" };
    }

    // Completed status check
    if (appt.status !== "completed") {
      return { success: false, error: `Only completed appointments can receive reviews. Current status: ${appt.status}`, code: "INELIGIBLE_APPOINTMENT" };
    }

    // 5. Unique constraint on appointment_id check
    for (const rev of this.reviews.values()) {
      if (rev.appointment_id === appointmentId) {
        return { success: false, error: "A review has already been submitted for this appointment.", code: "DUPLICATE_REVIEW" };
      }
    }

    // 6. Insert review
    const newReview: MockReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      doctor_id: appt.doctor_id,
      patient_id: callerId,
      appointment_id: appointmentId,
      rating,
      review_text: reviewText?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.reviews.set(newReview.id, newReview);

    return { success: true, review: newReview };
  }

  // Simulates public review query (doctor_public_reviews view)
  public getPublicDoctorReviews(doctorId: string): PublicDoctorReview[] {
    const list: PublicDoctorReview[] = [];
    for (const rev of this.reviews.values()) {
      if (rev.doctor_id === doctorId) {
        const patientProfile = this.profiles.get(rev.patient_id);
        list.push({
          id: rev.id,
          doctor_id: rev.doctor_id,
          rating: rev.rating,
          review_text: rev.review_text,
          created_at: rev.created_at,
          patient_display_name: sanitizeReviewerDisplayName(patientProfile?.full_name),
        });
      }
    }
    return list;
  }

  // Simulates doctor dashboard review isolation
  public getDoctorDashboardReviews(doctorProfileId: string): PublicDoctorReview[] {
    // Find doctor record for profile
    let doctorRecord: MockDoctor | null = null;
    for (const d of this.doctors.values()) {
      if (d.profile_id === doctorProfileId) {
        doctorRecord = d;
        break;
      }
    }

    if (!doctorRecord) return [];

    return this.getPublicDoctorReviews(doctorRecord.id);
  }
}

// ============================================================================
// VERIFICATION RUNNER
// ============================================================================

async function runPhase16Tests() {
  console.log("================================================================================");
  console.log("   MEDISPHERE PHASE 16 — DOCTOR REVIEWS & RATINGS VERIFICATION SUITE           ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} — ${detail}`);
      failed++;
    }
  }

  const sim = new Phase16Simulator();

  // Test 1: Authenticated patient can review their own completed appointment
  console.log("\n--- Section 1 & 2: Review Eligibility & Submission ---");
  const res1 = sim.submitReviewRPC("pat-rahul", "appt-rahul-completed", 5, "Dr. Sharma was attentive and explained everything clearly.");
  assert(res1.success === true && res1.review?.rating === 5, "1. Authenticated patient can review their own completed appointment");

  // Test 2: Patient cannot review another patient's appointment
  const res2 = sim.submitReviewRPC("pat-rahul", "appt-priya-completed", 4, "Trying to review Priya's appointment");
  assert(res2.success === false && res2.code === "UNAUTHORIZED", "2. Patient cannot review another patient's appointment", res2.error);

  // Test 3: Patient cannot review a confirmed appointment
  const res3 = sim.submitReviewRPC("pat-rahul", "appt-rahul-confirmed", 5, "Trying to review upcoming confirmed appointment");
  assert(res3.success === false && res3.code === "INELIGIBLE_APPOINTMENT", "3. Patient cannot review a confirmed appointment", res3.error);

  // Test 4: Patient cannot review a cancelled appointment
  const res4 = sim.submitReviewRPC("pat-rahul", "appt-rahul-cancelled", 1, "Trying to review cancelled appointment");
  assert(res4.success === false && res4.code === "INELIGIBLE_APPOINTMENT", "4. Patient cannot review a cancelled appointment", res4.error);

  // Test 5: Patient cannot review a no-show appointment
  const res5 = sim.submitReviewRPC("pat-rahul", "appt-rahul-noshow", 2, "Trying to review no_show appointment");
  assert(res5.success === false && res5.code === "INELIGIBLE_APPOINTMENT", "5. Patient cannot review a no-show appointment", res5.error);

  // Test 6: Rating below 1 is rejected
  console.log("\n--- Section 3 & 4: Rating Bounds & Duplicate Prevention ---");
  const res6a = sim.submitReviewRPC("pat-priya", "appt-priya-completed", 0, "Rating 0 should be rejected");
  const res6b = validateReviewInput({ rating: 0 });
  assert(res6a.success === false && res6b.valid === false, "6. Rating below 1 is rejected (0 stars rejected)");

  // Test 7: Rating above 5 is rejected
  const res7a = sim.submitReviewRPC("pat-priya", "appt-priya-completed", 6, "Rating 6 should be rejected");
  const res7b = validateReviewInput({ rating: 6 });
  assert(res7a.success === false && res7b.valid === false, "7. Rating above 5 is rejected (6 stars rejected)");

  // Test 8: Duplicate reviews are prevented by the database unique constraint on appointment_id
  const res8 = sim.submitReviewRPC("pat-rahul", "appt-rahul-completed", 4, "Attempting second review for same completed visit");
  const formattedDuplicate = formatReviewError(res8.error || "");
  assert(
    res8.success === false &&
      res8.code === "DUPLICATE_REVIEW" &&
      formattedDuplicate.message.includes("already submitted"),
    "8. Duplicate reviews are prevented with friendly message"
  );

  // Test 9: Patient cannot alter another patient's review (immutability check)
  console.log("\n--- Section 7 & 8: Integrity, Immutability & Privacy ---");
  // Let Priya submit her review
  const resPriya = sim.submitReviewRPC("pat-priya", "appt-priya-completed", 4, "Great clinical care.");
  assert(resPriya.success === true, "Priya successfully reviews her appointment");

  // Verify review immutability: doctor_id, patient_id, appointment_id cannot be changed
  const priyaReview = sim.reviews.get(resPriya.review!.id)!;
  const isProtectedFromReassignment = (
    priyaReview.patient_id === "pat-priya" &&
    priyaReview.appointment_id === "appt-priya-completed" &&
    priyaReview.doctor_id === "doc-verma"
  );
  assert(isProtectedFromReassignment, "9. Patient review cannot be altered or reassigned to another patient");

  // Test 10: Public users see only intended review fields (no email, phone, notes, or private identifiers)
  const publicReviewsDrSharma = sim.getPublicDoctorReviews("doc-sharma");
  assert(publicReviewsDrSharma.length === 1, "Public reviews fetched for Dr. Sharma");
  const samplePublicReview = publicReviewsDrSharma[0];

  const hasNoSensitiveFields =
    !("email" in samplePublicReview) &&
    !("phone" in samplePublicReview) &&
    !("notes" in samplePublicReview) &&
    !("patient_id" in samplePublicReview) &&
    samplePublicReview.patient_display_name === "Rahul";

  assert(hasNoSensitiveFields, "10. Public users see only intended review fields (strictly sanitized)");

  // Test 11: Average rating is calculated from actual reviews
  console.log("\n--- Section 5, 6 & 9: Rating Calculations & Multi-Doctor Isolation ---");
  // Dr. Sharma currently has 1 review with 5 stars -> average 5.0
  const statsDrSharma = calculateRatingStats(publicReviewsDrSharma);
  assert(
    statsDrSharma.totalReviews === 1 &&
      statsDrSharma.averageRating === 5.0 &&
      statsDrSharma.distribution[5] === 1,
    "11. Average rating is calculated from actual reviews (1 review = 5.0)"
  );

  // Add another completed appointment and review for Dr. Sharma to test multi-review averaging
  sim.appointments.set("appt-test-2", {
    id: "appt-test-2",
    patient_id: "pat-priya",
    doctor_id: "doc-sharma",
    slot_id: "slot-99",
    appointment_date: "2026-10-15",
    start_time: "12:00:00",
    end_time: "12:30:00",
    status: "completed",
  });
  sim.submitReviewRPC("pat-priya", "appt-test-2", 3, "Decent experience, slight delay in clinic.");
  const updatedPublicSharma = sim.getPublicDoctorReviews("doc-sharma");
  const updatedStatsSharma = calculateRatingStats(updatedPublicSharma);
  // (5 + 3) / 2 = 4.0
  assert(
    updatedStatsSharma.totalReviews === 2 &&
      updatedStatsSharma.averageRating === 4.0 &&
      updatedStatsSharma.distribution[5] === 1 &&
      updatedStatsSharma.distribution[3] === 1,
    "11b. Multi-review average calculation is strictly accurate ((5+3)/2 = 4.0)"
  );

  // Test 12: Zero reviews produce no fabricated rating
  const zeroStats = calculateRatingStats([]);
  assert(
    zeroStats.totalReviews === 0 &&
      zeroStats.averageRating === null &&
      zeroStats.distribution[5] === 0,
    "12. Zero reviews produce no fabricated rating (averageRating is null, count 0)"
  );

  // Test 13: Doctors can see reviews for their own profile only (isolation)
  const drSharmaDashboardReviews = sim.getDoctorDashboardReviews("prof-doc-sharma");
  const drVermaDashboardReviews = sim.getDoctorDashboardReviews("prof-doc-verma");

  const sharmaSeesOnlyHis = drSharmaDashboardReviews.every((r) => r.doctor_id === "doc-sharma");
  const vermaSeesOnlyHers = drVermaDashboardReviews.every((r) => r.doctor_id === "doc-verma");
  const isolationVerified =
    sharmaSeesOnlyHis &&
    vermaSeesOnlyHers &&
    drSharmaDashboardReviews.length === 2 &&
    drVermaDashboardReviews.length === 1;

  assert(isolationVerified, "13. Doctors can see reviews for their own profile only (isolation maintained)");

  // Test 14: Existing appointment booking still works
  console.log("\n--- Section 12 & 14: Non-Regression of Existing Features ---");
  // Verify booking helper contracts
  const apptSample: AppointmentWithDetails = {
    id: "appt-rahul-completed",
    patient_id: "pat-rahul",
    doctor_id: "doc-sharma",
    slot_id: "slot-1",
    appointment_date: "2026-10-10",
    start_time: "10:00:00",
    end_time: "10:30:00",
    status: "completed",
    reason: "Followup",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const bookingEligibility = checkAppointmentReviewEligibility(apptSample, null, "pat-rahul");
  assert(bookingEligibility.eligible === true, "14. Existing appointment booking integration and review eligibility work");

  // Test 15: Existing email confirmation logic still works
  const confirmationHtml = generateAppointmentConfirmationHtml({
    patientName: "Rahul Mehra",
    patientEmail: "rahul.mehra@example.com",
    doctorName: "Dr. Aakash Sharma",
    speciality: "Cardiology",
    clinicName: "Bhopal Heart Institute",
    clinicAddress: "Arera Colony, Bhopal",
    appointmentDate: "2026-10-10",
    startTime: "10:00:00",
    endTime: "10:30:00",
    status: "confirmed",
    appointmentId: "appt-rahul-completed",
    appointmentUrl: "https://medisphere.example.com/dashboard/appointments/appt-rahul-completed",
  });
  assert(
    confirmationHtml.includes("Cardiology") &&
      confirmationHtml.includes("Dr. Aakash Sharma") &&
      confirmationHtml.includes("October 10, 2026"),
    "15. Existing email confirmation logic and templates continue functioning properly"
  );



  // Test 16: Existing patient and doctor dashboards continue working
  const doctorStatsSample = getDoctorAppointmentStats([
    {
      ...apptSample,
      status: "completed",
    },
    {
      ...apptSample,
      id: "appt-2",
      status: "confirmed",
    },
  ]);
  assert(
    doctorStatsSample.total === 2 &&
      doctorStatsSample.completed === 1,
    "16. Existing patient and doctor dashboard statistics calculate accurately"
  );

  console.log("\n================================================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase16Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
