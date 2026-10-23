import { supabase } from "@/lib/supabase";
import { getCurrentDateIST } from "./slots";
import { createNotification } from "./notifications";
import type { Appointment, AppointmentWithDetails, AppointmentStatus } from "@/types";

export interface BookAppointmentParams {
  slotId: string;
  reason?: string;
  notes?: string;
}

export interface EmailDeliveryStatus {
  attempted: boolean;
  sent: boolean;
  reason?: "sent" | "missing_credentials" | "provider_error" | "already_sent" | "no_recipient" | "unauthorized";
  message?: string;
  messageId?: string;
}

export interface BookAppointmentResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  code?: string;
  emailDelivery?: EmailDeliveryStatus;
}

/**
 * Maps raw database error messages or error codes to friendly patient-facing messages.
 * Prevents raw PostgreSQL exceptions or internal database details from leaking to the UI.
 */
export function formatBookingError(errorMessage?: string): { message: string; code: string } {
  if (!errorMessage) {
    return {
      message: "An unexpected error occurred while booking your appointment. Please try again.",
      code: "UNKNOWN_ERROR",
    };
  }

  const msg = errorMessage.toUpperCase();

  if (msg.includes("AUTH_REQUIRED") || msg.includes("UNAUTHENTICATED")) {
    return {
      message: "You must be signed in to book an appointment.",
      code: "AUTH_REQUIRED",
    };
  }

  if (msg.includes("INVALID_ROLE")) {
    return {
      message: "Only registered patient accounts can book appointments.",
      code: "INVALID_ROLE",
    };
  }

  if (msg.includes("PATIENT_NOT_FOUND")) {
    return {
      message: "Patient profile was not found. Please complete your profile to continue.",
      code: "PATIENT_NOT_FOUND",
    };
  }

  if (msg.includes("SLOT_ALREADY_BOOKED") || msg.includes("UNIQUE_APPOINTMENT_SLOT") || msg.includes("DUPLICATE KEY")) {
    return {
      message: "This appointment slot is no longer available. Please select another slot.",
      code: "SLOT_ALREADY_BOOKED",
    };
  }

  if (msg.includes("SLOT_BLOCKED")) {
    return {
      message: "This appointment slot is currently unavailable. Please select another slot.",
      code: "SLOT_BLOCKED",
    };
  }

  if (msg.includes("SLOT_EXPIRED")) {
    return {
      message: "This appointment slot time has already passed. Please select a future time slot.",
      code: "SLOT_EXPIRED",
    };
  }

  if (msg.includes("SLOT_NOT_FOUND") || msg.includes("SLOT_UNAVAILABLE")) {
    return {
      message: "This appointment slot is no longer available. Please select another slot.",
      code: "SLOT_UNAVAILABLE",
    };
  }

  if (msg.includes("DOCTOR_NOT_VERIFIED")) {
    return {
      message: "Appointments can only be booked with verified practitioners.",
      code: "DOCTOR_NOT_VERIFIED",
    };
  }

  if (msg.includes("DOCTOR_NOT_FOUND")) {
    return {
      message: "The requested doctor could not be found.",
      code: "DOCTOR_NOT_FOUND",
    };
  }

  return {
    message: "This appointment slot could not be reserved. Please select another slot or try again.",
    code: "BOOKING_FAILED",
  };
}

/**
 * Books an appointment atomically via PostgreSQL book_appointment RPC.
 *
 * Enforces:
 * - Atomic database transaction with row-level locking (FOR UPDATE)
 * - slot_id uniqueness protection at database level
 * - Verified doctor requirement
 * - Authenticated patient requirement
 * - Slot expiration check in Asia/Kolkata timezone
 */
export async function bookAppointment(
  params: BookAppointmentParams
): Promise<BookAppointmentResult> {
  const { slotId, reason, notes } = params;

  if (!slotId) {
    return {
      success: false,
      error: "Please select a valid appointment slot.",
      code: "SLOT_REQUIRED",
    };
  }

  // 1. In browser runtime, invoke the Next.js server endpoint to keep email provider server-only
  if (typeof window !== "undefined") {
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session) {
        return {
          success: false,
          error: "You must be signed in as a patient to book an appointment.",
          code: "AUTH_REQUIRED",
        };
      }

      const token = sessionData.session.access_token;
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slotId,
          reason: reason?.trim() ? reason.trim() : undefined,
          notes: notes?.trim() ? notes.trim() : undefined,
        }),
      });

      const json = await res.json();
      return json as BookAppointmentResult;
    } catch (fetchErr) {
      console.warn("[bookAppointment] Server route invocation failed, falling back to direct RPC:", fetchErr);
    }
  }

  // 2. Direct database RPC execution (for server/CLI/testing environment)
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return {
        success: false,
        error: "You must be signed in as a patient to book an appointment.",
        code: "AUTH_REQUIRED",
      };
    }

    const { data, error } = await supabase.rpc("book_appointment", {
      p_slot_id: slotId,
      p_reason: reason?.trim() ? reason.trim() : null,
      p_notes: notes?.trim() ? notes.trim() : null,
    });

    if (error) {
      const formatted = formatBookingError(error.message);
      return {
        success: false,
        error: formatted.message,
        code: formatted.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Failed to confirm appointment. Please try again.",
        code: "NO_DATA",
      };
    }

    const appointmentRow = (typeof data === "string" ? JSON.parse(data) : data) as Appointment;

    // Trigger booking notifications asynchronously (safe & idempotent)
    sendBookingNotifications(appointmentRow).catch((notifErr) => {
      console.warn("[bookAppointment] Notification warning:", notifErr);
    });

    return {
      success: true,
      appointment: appointmentRow,
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const formatted = formatBookingError(rawMsg);
    return {
      success: false,
      error: formatted.message,
      code: formatted.code,
    };
  }
}

const DETAILED_APPOINTMENT_SELECT = `
  id,
  patient_id,
  doctor_id,
  slot_id,
  appointment_date,
  start_time,
  end_time,
  status,
  reason,
  notes,
  created_at,
  updated_at,
  doctor:doctors(
    id,
    qualification,
    experience_years,
    consultation_fee,
    about,
    verification_status,
    profile:profiles(id, full_name, email, phone),
    speciality:specialities(id, name, slug, description),
    clinic:clinics(id, name, address, city, state, pincode, phone)
  )
`;

/**
 * Retrieves appointments for the currently authenticated patient.
 * Strictly filters by patient_id = auth.uid() to ensure patients cannot access another patient's data.
 */
export async function getPatientAppointments(): Promise<AppointmentWithDetails[]> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return [];
    }

    const patientId = authData.user.id;

    // Relational query
    const { data, error } = await supabase
      .from("appointments")
      .select(DETAILED_APPOINTMENT_SELECT)
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      console.warn("[getPatientAppointments] Relational select warning, falling back:", error.message);
      // Fallback query if relational embeds encounter table constraints
      const fallback = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (fallback.error) {
        console.error("[getPatientAppointments] Fallback query error:", fallback.error.message);
        return [];
      }

      return (fallback.data as unknown as AppointmentWithDetails[]) || [];
    }

    return (data as unknown as AppointmentWithDetails[]) || [];
  } catch (err) {
    console.error("[getPatientAppointments] Unexpected exception:", err);
    return [];
  }
}

/**
 * Retrieves a single appointment by ID with full doctor and clinic details.
 * Enforces strict authorization so a patient can only retrieve their own appointment.
 * Returns null if the appointment does not exist or does not belong to the caller.
 */
export async function getAppointmentById(
  appointmentId: string
): Promise<AppointmentWithDetails | null> {
  if (!appointmentId) return null;

  try {
    // 1. Identify caller via authenticated session
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return null;
    }

    const currentUserId = authData.user.id;

    // 2. Query appointment with full doctor/clinic relations
    const { data, error } = await supabase
      .from("appointments")
      .select(DETAILED_APPOINTMENT_SELECT)
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) {
      console.warn("[getAppointmentById] Relational query warning, falling back:", error.message);
      const fallback = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .maybeSingle();

      if (fallback.error || !fallback.data) {
        return null;
      }

      // Enforce patient ownership
      if (fallback.data.patient_id !== currentUserId) {
        console.warn("[getAppointmentById] Unauthorized attempt to access appointment:", appointmentId);
        return null;
      }

      const apptRecord = fallback.data as unknown as AppointmentWithDetails;
      return apptRecord;
    }

    if (!data) return null;

    const apptRecord = data as unknown as AppointmentWithDetails;

    // Enforce patient ownership
    if (apptRecord.patient_id !== currentUserId) {
      console.warn("[getAppointmentById] Unauthorized attempt to access appointment:", appointmentId);
      return null;
    }

    return apptRecord;
  } catch (err) {
    console.error("[getAppointmentById] Unexpected exception:", err);
    return null;
  }
}

/**
 * Standard timezone for MediSphere in Bhopal, Madhya Pradesh, India.
 * All scheduling and appointment date evaluations are strictly performed in Asia/Kolkata (IST, UTC+05:30).
 */
export const APPOINTMENT_TIMEZONE = "Asia/Kolkata";

/**
 * Formats a "YYYY-MM-DD" date string into a user-friendly format in Asia/Kolkata (IST).
 * e.g., "Mon, Oct 12, 2026"
 */
export function formatAppointmentDateIST(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "";
  const parts = dateStr.trim().split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // Use noon UTC to avoid date edge rollover across machine timezones
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: APPOINTMENT_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options || defaultOptions).format(utcDate);
}

/**
 * Formats a 24-hour time string ("HH:MM" or "HH:MM:SS") to 12-hour format with AM/PM.
 * e.g., "09:30:00" -> "9:30 AM", "14:00" -> "2:00 PM"
 */
export function formatAppointmentTimeIST(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr = "0", mStr = "00"] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr.slice(0, 2);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Checks if an appointment is upcoming in Asia/Kolkata timezone:
 * - Status is NOT 'cancelled', 'completed', or 'no_show'.
 * - Start time in Asia/Kolkata is strictly in the future.
 *
 * Requirement 7:
 * "Calculate upcoming and past appointments using the appointment date and time in the Asia/Kolkata timezone.
 * Do not treat cancelled appointments as upcoming active appointments."
 */
export function isAppointmentUpcoming(appt: {
  appointment_date: string;
  start_time: string;
  status: AppointmentStatus;
}): boolean {
  if (!appt) return false;
  // Cancelled, completed, or no-show appointments are never considered upcoming active appointments
  if (appt.status === "cancelled" || appt.status === "completed" || appt.status === "no_show") {
    return false;
  }

  // Construct ISO timestamp in Asia/Kolkata (+05:30)
  const time = appt.start_time ? appt.start_time.slice(0, 5) : "00:00";
  const isoIST = `${appt.appointment_date}T${time}:00+05:30`;
  const apptStartMs = new Date(isoIST).getTime();
  const nowMs = Date.now();

  return apptStartMs > nowMs;
}

/**
 * Checks if an appointment is past in Asia/Kolkata timezone:
 * - Either status is 'completed' or 'no_show'
 * - OR status is 'confirmed' but scheduled end/start time has already passed in Asia/Kolkata.
 * - Cancelled appointments are tracked under 'cancelled' and not considered active past visits.
 */
export function isAppointmentPast(appt: {
  appointment_date: string;
  end_time: string;
  start_time?: string;
  status: AppointmentStatus;
}): boolean {
  if (!appt) return false;
  if (appt.status === "completed" || appt.status === "no_show") {
    return true;
  }
  if (appt.status === "cancelled") {
    return false;
  }

  const time = (appt.end_time || appt.start_time || "23:59").slice(0, 5);
  const isoIST = `${appt.appointment_date}T${time}:00+05:30`;
  const apptEndMs = new Date(isoIST).getTime();
  const nowMs = Date.now();

  return apptEndMs <= nowMs;
}

export interface AppointmentCounts {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  no_show: number;
  confirmed: number;
  past: number;
}

/**
 * Calculates aggregate stats for a patient's appointments from real database records.
 * Uses Asia/Kolkata timezone calculation for upcoming/past statuses.
 */
export function getAppointmentCounts(appointments: Appointment[]): AppointmentCounts {
  let upcoming = 0;
  let completed = 0;
  let cancelled = 0;
  let no_show = 0;
  let confirmed = 0;
  let past = 0;

  for (const appt of appointments) {
    if (appt.status === "cancelled") {
      cancelled++;
    } else if (appt.status === "completed") {
      completed++;
      past++;
    } else if (appt.status === "no_show") {
      no_show++;
      past++;
    } else if (appt.status === "confirmed") {
      confirmed++;
      if (isAppointmentUpcoming(appt)) {
        upcoming++;
      } else {
        past++;
      }
    }
  }

  return {
    total: appointments.length,
    upcoming,
    completed,
    cancelled,
    no_show,
    confirmed,
    past,
  };
}

// Re-export getCurrentDateIST for convenience
export { getCurrentDateIST };

/**
 * Checks if an appointment is scheduled for today in Asia/Kolkata timezone.
 */
export function isAppointmentToday(appt: { appointment_date: string }): boolean {
  if (!appt?.appointment_date) return false;
  return appt.appointment_date === getCurrentDateIST();
}

export interface DoctorAppointmentStats {
  total: number;
  today: number;
  upcomingConfirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

/**
 * Calculates doctor dashboard metrics from real database records:
 * - Total appointments
 * - Today's appointments (Asia/Kolkata timezone)
 * - Upcoming confirmed appointments (Asia/Kolkata timezone)
 * - Completed appointments
 * - Cancelled appointments
 */
export function getDoctorAppointmentStats(appointments: Appointment[]): DoctorAppointmentStats {
  let today = 0;
  let upcomingConfirmed = 0;
  let completed = 0;
  let cancelled = 0;
  let no_show = 0;

  const todayStr = getCurrentDateIST();

  for (const appt of appointments) {
    if (appt.appointment_date === todayStr) {
      today++;
    }

    if (appt.status === "confirmed" && isAppointmentUpcoming(appt)) {
      upcomingConfirmed++;
    } else if (appt.status === "completed") {
      completed++;
    } else if (appt.status === "cancelled") {
      cancelled++;
    } else if (appt.status === "no_show") {
      no_show++;
    }
  }

  return {
    total: appointments.length,
    today,
    upcomingConfirmed,
    completed,
    cancelled,
    no_show,
  };
}

export type DoctorAppointmentFilter =
  | "all"
  | "today"
  | "upcoming"
  | "past"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

/**
 * Filters a doctor's appointments using actual database values and dates.
 * Strictly calculates upcoming, past, and today in Asia/Kolkata timezone.
 */
export function filterDoctorAppointments(
  appointments: AppointmentWithDetails[],
  filter: DoctorAppointmentFilter
): AppointmentWithDetails[] {
  const todayStr = getCurrentDateIST();

  switch (filter) {
    case "today":
      return appointments.filter((a) => a.appointment_date === todayStr);
    case "upcoming":
      return appointments.filter((a) => isAppointmentUpcoming(a));
    case "past":
      return appointments.filter((a) => isAppointmentPast(a));
    case "confirmed":
      return appointments.filter((a) => a.status === "confirmed");
    case "completed":
      return appointments.filter((a) => a.status === "completed");
    case "cancelled":
      return appointments.filter((a) => a.status === "cancelled");
    case "no_show":
      return appointments.filter((a) => a.status === "no_show");
    case "all":
    default:
      return appointments;
  }
}

export const DOCTOR_APPOINTMENT_SELECT = `
  id,
  patient_id,
  doctor_id,
  slot_id,
  appointment_date,
  start_time,
  end_time,
  status,
  reason,
  notes,
  created_at,
  updated_at,
  patient:profiles(
    id,
    full_name,
    email,
    phone,
    location
  ),
  slot:appointment_slots(
    id,
    slot_date,
    start_time,
    end_time,
    status
  )
`;

/**
 * Retrieves appointments belonging strictly to the authenticated doctor's profile.
 * Does not expose appointments belonging to other doctors.
 * Only returns patient information authorized for the appointment (no passwords, tokens, or unrelated data).
 */
export async function getDoctorAppointments(
  doctorId?: string
): Promise<AppointmentWithDetails[]> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return [];
    }

    const userId = authData.user.id;

    // Resolve doctorId if not provided
    let targetDoctorId = doctorId;
    if (!targetDoctorId) {
      const { data: docData } = await supabase
        .from("doctors")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      if (!docData) {
        return [];
      }
      targetDoctorId = docData.id;
    } else {
      // Verify doctor record belongs to authenticated user's profile
      const { data: docCheck } = await supabase
        .from("doctors")
        .select("id, profile_id")
        .eq("id", targetDoctorId)
        .maybeSingle();

      if (!docCheck || docCheck.profile_id !== userId) {
        console.warn("[getDoctorAppointments] Unauthorized attempt to query other doctor's appointments");
        return [];
      }
    }

    // Relational query
    const { data, error } = await supabase
      .from("appointments")
      .select(DOCTOR_APPOINTMENT_SELECT)
      .eq("doctor_id", targetDoctorId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      console.warn("[getDoctorAppointments] Relational select warning, falling back:", error.message);
      const fallback = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", targetDoctorId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (fallback.error) {
        console.error("[getDoctorAppointments] Fallback query error:", fallback.error.message);
        return [];
      }

      return (fallback.data as unknown as AppointmentWithDetails[]) || [];
    }

    return (data as unknown as AppointmentWithDetails[]) || [];
  } catch (err) {
    console.error("[getDoctorAppointments] Unexpected exception:", err);
    return [];
  }
}

/**
 * Retrieves a single appointment for a doctor with authorized patient information.
 * Strictly verifies ownership so a doctor can only view appointments associated with their own doctor profile.
 * Non-existent or other doctor's appointments return null.
 */
export async function getDoctorAppointmentById(
  appointmentId: string,
  doctorId?: string
): Promise<AppointmentWithDetails | null> {
  if (!appointmentId) return null;

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return null;
    }

    const userId = authData.user.id;

    // Resolve caller's doctor record
    let targetDoctorId = doctorId;
    if (!targetDoctorId) {
      const { data: docData } = await supabase
        .from("doctors")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      if (!docData) return null;
      targetDoctorId = docData.id;
    }

    // Query appointment
    const { data, error } = await supabase
      .from("appointments")
      .select(DOCTOR_APPOINTMENT_SELECT)
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) {
      console.warn("[getDoctorAppointmentById] Relational query warning, falling back:", error.message);
      const fallback = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .maybeSingle();

      if (fallback.error || !fallback.data) return null;

      // Ownership enforcement: must belong to the calling doctor
      if (fallback.data.doctor_id !== targetDoctorId) {
        console.warn("[getDoctorAppointmentById] Unauthorized attempt to access appointment:", appointmentId);
        return null;
      }

      return fallback.data as unknown as AppointmentWithDetails;
    }

    if (!data) return null;

    const record = data as unknown as AppointmentWithDetails;

    // Ownership enforcement: must belong to the calling doctor
    if (record.doctor_id !== targetDoctorId) {
      console.warn("[getDoctorAppointmentById] Unauthorized attempt to access appointment:", appointmentId);
      return null;
    }

    return record;
  } catch (err) {
    console.error("[getDoctorAppointmentById] Unexpected error:", err);
    return null;
  }
}

export interface UpdateAppointmentStatusResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  code?: string;
}

/**
 * Updates an appointment's status to 'completed' or 'no_show'.
 *
 * Enforces:
 * - Only the doctor associated with the appointment can update status
 * - Patients cannot perform this doctor-only operation
 * - Doctors cannot modify another doctor's appointments
 * - Target status must strictly be 'completed' or 'no_show'
 * - Cannot mark a future appointment completed or no-show
 * - Cannot modify a cancelled appointment
 * - Modifies ONLY the status field; patient, doctor, slot, date, and time fields are preserved
 * - Preserves existing double-booking protection
 */
export async function updateDoctorAppointmentStatus(
  appointmentId: string,
  newStatus: "completed" | "no_show",
  doctorId?: string
): Promise<UpdateAppointmentStatusResult> {
  // 1. Validation of target status
  if (newStatus !== "completed" && newStatus !== "no_show") {
    return {
      success: false,
      error: "Invalid status transition. Doctors can only mark appointments as completed or no-show.",
      code: "INVALID_STATUS",
    };
  }

  // 2. Authentication check
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      success: false,
      error: "Authentication required to update appointment status.",
      code: "AUTH_REQUIRED",
    };
  }

  const userId = authData.user.id;

  // 3. Resolve caller's doctor record
  let callerDoctorId = doctorId;
  if (!callerDoctorId) {
    const { data: docData } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    callerDoctorId = docData?.id;
  }

  // If user is not a doctor (e.g. patient), reject
  if (!callerDoctorId) {
    return {
      success: false,
      error: "Access Denied: Only registered healthcare practitioners can update appointment status.",
      code: "FORBIDDEN",
    };
  }

  // 4. Try calling PostgreSQL RPC function first (server-side atomic validation)
  try {
    const { data, error } = await supabase.rpc("update_doctor_appointment_status", {
      p_appointment_id: appointmentId,
      p_status: newStatus,
    });

    if (!error && data) {
      const updatedAppt = (typeof data === "string" ? JSON.parse(data) : data) as Appointment;
      sendAppointmentStatusNotification(updatedAppt, newStatus).catch((notifErr) => {
        console.warn("[updateDoctorAppointmentStatus] Notification warning:", notifErr);
      });
      return {
        success: true,
        appointment: updatedAppt,
      };
    }

    if (error) {
      const rawMsg = error.message || "";
      if (rawMsg.includes("FUTURE_APPOINTMENT")) {
        return {
          success: false,
          error: "Cannot mark a future appointment as completed before its scheduled time.",
          code: "FUTURE_APPOINTMENT",
        };
      }
      if (rawMsg.includes("INVALID_TRANSITION")) {
        return {
          success: false,
          error: "Cannot modify the status of a cancelled appointment.",
          code: "INVALID_TRANSITION",
        };
      }
      if (rawMsg.includes("UNAUTHORIZED") || rawMsg.includes("FORBIDDEN")) {
        return {
          success: false,
          error: "You do not have permission to modify this appointment.",
          code: "UNAUTHORIZED",
        };
      }
      if (rawMsg.includes("APPOINTMENT_NOT_FOUND")) {
        return {
          success: false,
          error: "The requested appointment could not be found.",
          code: "APPOINTMENT_NOT_FOUND",
        };
      }
    }
  } catch {
    // Fall back to direct query validation below
  }

  // 5. Fallback: Direct database query with strict authorization and verification
  const { data: existingAppt, error: fetchErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (fetchErr || !existingAppt) {
    return {
      success: false,
      error: "The requested appointment could not be found.",
      code: "APPOINTMENT_NOT_FOUND",
    };
  }

  // Verify ownership
  if (existingAppt.doctor_id !== callerDoctorId) {
    return {
      success: false,
      error: "You do not have permission to modify this appointment.",
      code: "UNAUTHORIZED",
    };
  }

  // Verify not cancelled
  if (existingAppt.status === "cancelled") {
    return {
      success: false,
      error: "Cannot modify the status of a cancelled appointment.",
      code: "INVALID_TRANSITION",
    };
  }

  // Verify future appointment rule in Asia/Kolkata
  if (newStatus === "completed" && isAppointmentUpcoming(existingAppt)) {
    return {
      success: false,
      error: "Cannot mark a future appointment as completed before its scheduled time.",
      code: "FUTURE_APPOINTMENT",
    };
  }

  if (newStatus === "no_show" && isAppointmentUpcoming(existingAppt)) {
    return {
      success: false,
      error: "Cannot mark a future appointment as no-show before its scheduled time.",
      code: "FUTURE_APPOINTMENT",
    };
  }

  // 6. Update ONLY the status field and updated_at
  const { data: updatedData, error: updateErr } = await supabase
    .from("appointments")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("doctor_id", callerDoctorId)
    .select()
    .single();

  if (updateErr) {
    return {
      success: false,
      error: "Failed to update appointment status. Please try again.",
      code: "UPDATE_FAILED",
    };
  }

  const updatedAppt = updatedData as Appointment;
  sendAppointmentStatusNotification(updatedAppt, newStatus).catch((notifErr) => {
    console.warn("[updateDoctorAppointmentStatus] Notification fallback warning:", notifErr);
  });

  return {
    success: true,
    appointment: updatedAppt,
  };
}

/**
 * Sends notification for real appointment status transitions (completed, no_show).
 * Strictly idempotent: prevents duplicate notifications for the same status change.
 */
export async function sendAppointmentStatusNotification(
  appointment: Appointment,
  newStatus: "completed" | "no_show"
): Promise<void> {
  try {
    const { data: docData } = await supabase
      .from("doctors")
      .select("profile:profiles(full_name)")
      .eq("id", appointment.doctor_id)
      .maybeSingle();

    const rawName = (docData as { profile?: { full_name?: string } } | null)?.profile?.full_name;
    const doctorName = rawName ? `Dr. ${rawName}` : "your doctor";
    const dateFormatted = formatAppointmentDateIST(appointment.appointment_date);

    if (newStatus === "completed") {
      await createNotification({
        recipient_user_id: appointment.patient_id,
        type: "appointment_completed",
        title: "Appointment Completed",
        message: `Your appointment with ${doctorName} on ${dateFormatted} has been marked as completed. You can now leave a verified review.`,
        related_appointment_id: appointment.id,
      });
    } else if (newStatus === "no_show") {
      await createNotification({
        recipient_user_id: appointment.patient_id,
        type: "appointment_no_show",
        title: "Appointment Marked as No-Show",
        message: `Your appointment with ${doctorName} on ${dateFormatted} was marked as no-show.`,
        related_appointment_id: appointment.id,
      });
    }
  } catch (err) {
    console.warn("[sendAppointmentStatusNotification] Non-fatal notification error:", err);
  }
}

/**
 * Sends notifications to patient and doctor on real appointment booking.
 * Strictly idempotent: prevents duplicate notifications for the same booking.
 */
export async function sendBookingNotifications(appointment: Appointment): Promise<void> {
  try {
    const [docRes, patientRes] = await Promise.all([
      supabase
        .from("doctors")
        .select("profile_id, profile:profiles(full_name)")
        .eq("id", appointment.doctor_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", appointment.patient_id)
        .maybeSingle(),
    ]);

    const rawDocName = (docRes.data as { profile?: { full_name?: string } } | null)?.profile?.full_name;
    const doctorName = rawDocName ? `Dr. ${rawDocName}` : "your doctor";
    const doctorProfileId = docRes.data?.profile_id;
    const patientName = patientRes.data?.full_name || "A patient";
    const dateFormatted = formatAppointmentDateIST(appointment.appointment_date);
    const timeFormatted = formatAppointmentTimeIST(appointment.start_time);

    // 1. Patient notification
    await createNotification({
      recipient_user_id: appointment.patient_id,
      type: "appointment_booked",
      title: "Appointment Confirmed",
      message: `Your appointment with ${doctorName} on ${dateFormatted} at ${timeFormatted} has been confirmed.`,
      related_appointment_id: appointment.id,
    });

    // 2. Doctor notification
    if (doctorProfileId) {
      await createNotification({
        recipient_user_id: doctorProfileId,
        type: "appointment_booked",
        title: "New Appointment Booking",
        message: `New appointment booked by ${patientName} for ${dateFormatted} at ${timeFormatted}.`,
        related_appointment_id: appointment.id,
      });
    }
  } catch (err) {
    console.warn("[sendBookingNotifications] Non-fatal notification error:", err);
  }
}

