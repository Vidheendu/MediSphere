import { supabase } from "@/lib/supabase";
import type { Appointment, AppointmentWithDetails, AppointmentStatus } from "@/types";

export interface BookAppointmentParams {
  slotId: string;
  reason?: string;
  notes?: string;
}

export interface BookAppointmentResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  code?: string;
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

  try {
    // 1. Verify user session
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return {
        success: false,
        error: "You must be signed in as a patient to book an appointment.",
        code: "AUTH_REQUIRED",
      };
    }

    // 2. Call atomic RPC book_appointment
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

    // The RPC returns JSON representation of the created appointment row
    const appointmentRow = (typeof data === "string" ? JSON.parse(data) : data) as Appointment;

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
