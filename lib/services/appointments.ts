import { supabase } from "@/lib/supabase";
import type { Appointment, AppointmentWithDetails } from "@/types";

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
 * Enforces RLS so a patient can only retrieve their own appointment.
 */
export async function getAppointmentById(
  appointmentId: string
): Promise<AppointmentWithDetails | null> {
  if (!appointmentId) return null;

  try {
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

      return fallback.data as unknown as AppointmentWithDetails;
    }

    return (data as unknown as AppointmentWithDetails) || null;
  } catch (err) {
    console.error("[getAppointmentById] Unexpected exception:", err);
    return null;
  }
}
