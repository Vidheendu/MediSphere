import { supabase } from "@/lib/supabase";
import type { DayOfWeek, DoctorSchedule, Doctor } from "@/types";

export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface ScheduleInput {
  id?: string;
  doctor_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  break_start?: string | null;
  break_end?: string | null;
  appointment_duration: number; // minutes
  is_active?: boolean;
}

export interface ScheduleValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Converts "HH:MM" or "HH:MM:SS" time string into total minutes from midnight.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Normalizes time string to "HH:MM" format.
 */
export function formatTimeHHMM(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hh = parts[0].padStart(2, "0");
  const mm = parts[1].padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Validates doctor schedule inputs against healthcare business logic:
 * - Day of week must be canonical
 * - End time must be strictly after start time
 * - Break start must be strictly before break end
 * - Break must fall completely inside the working hours
 * - Appointment duration must be a positive integer
 * - Appointment duration must not exceed available working duration
 */
export function validateScheduleInput(input: Partial<ScheduleInput>): ScheduleValidationResult {
  const errors: string[] = [];

  // 1. Day of week
  if (!input.day_of_week || !DAYS_OF_WEEK.includes(input.day_of_week)) {
    errors.push(`Day of week must be one of: ${DAYS_OF_WEEK.join(", ")}.`);
  }

  // 2. Start time and End time
  if (!input.start_time || typeof input.start_time !== "string") {
    errors.push("Working start time is required.");
  }
  if (!input.end_time || typeof input.end_time !== "string") {
    errors.push("Working end time is required.");
  }

  const startMin = input.start_time ? timeToMinutes(input.start_time) : -1;
  const endMin = input.end_time ? timeToMinutes(input.end_time) : -1;

  if (startMin >= 0 && endMin >= 0) {
    if (endMin <= startMin) {
      errors.push("End time must be after start time.");
    }
  }

  // 3. Breaks
  const hasBreakStart = Boolean(input.break_start && input.break_start.trim().length > 0);
  const hasBreakEnd = Boolean(input.break_end && input.break_end.trim().length > 0);

  let breakDuration = 0;

  if (hasBreakStart || hasBreakEnd) {
    if (!hasBreakStart || !hasBreakEnd) {
      errors.push("Both break start and break end must be provided if configuring a break period.");
    } else {
      const breakStartMin = timeToMinutes(input.break_start!);
      const breakEndMin = timeToMinutes(input.break_end!);

      if (breakEndMin <= breakStartMin) {
        errors.push("Break end time must be after break start time.");
      } else {
        breakDuration = breakEndMin - breakStartMin;
      }

      if (startMin >= 0 && endMin >= 0) {
        if (breakStartMin < startMin) {
          errors.push("Break start cannot be earlier than shift start time.");
        }
        if (breakEndMin > endMin) {
          errors.push("Break end cannot be later than shift end time.");
        }
      }
    }
  }

  // 4. Appointment duration
  if (
    input.appointment_duration === undefined ||
    input.appointment_duration === null ||
    typeof input.appointment_duration !== "number" ||
    !Number.isInteger(input.appointment_duration) ||
    input.appointment_duration <= 0
  ) {
    errors.push("Appointment duration must be an integer greater than 0 minutes.");
  } else if (startMin >= 0 && endMin > startMin) {
    const totalWorkingMinutes = endMin - startMin - breakDuration;
    if (input.appointment_duration > totalWorkingMinutes) {
      errors.push(
        `Appointment duration (${input.appointment_duration} mins) cannot exceed total working duration (${totalWorkingMinutes} mins).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Resolves the doctor table record associated with a Supabase user/profile ID.
 */
export async function getDoctorByProfileId(profileId: string): Promise<Doctor | null> {
  if (!profileId) return null;

  try {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) {
      console.warn("[getDoctorByProfileId] Query warning:", error.message);
      return null;
    }

    return (data as Doctor) ?? null;
  } catch (err) {
    console.error("[getDoctorByProfileId] Failed to resolve doctor:", err);
    return null;
  }
}

/**
 * Resolves or creates a doctor table record for an authenticated user profile with role='doctor'.
 */
export async function getOrCreateDoctorForProfile(profileId: string): Promise<Doctor | null> {
  if (!profileId) return null;

  const existing = await getDoctorByProfileId(profileId);
  if (existing) return existing;

  try {
    const { data, error } = await supabase
      .from("doctors")
      .insert({
        profile_id: profileId,
        verification_status: "pending",
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[getOrCreateDoctorForProfile] Could not insert doctor record:", error.message);
      return null;
    }

    return (data as Doctor) ?? null;
  } catch (err) {
    console.error("[getOrCreateDoctorForProfile] Exception creating doctor record:", err);
    return null;
  }
}

/**
 * Retrieves all schedule configurations for a specific doctor.
 * Used in the Doctor Dashboard to manage weekly availability.
 * Orders results in canonical Monday -> Sunday sequence.
 */
export async function getDoctorSchedules(doctorId: string): Promise<DoctorSchedule[]> {
  if (!doctorId) return [];

  try {
    const { data, error } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId);

    if (error) {
      console.warn("[getDoctorSchedules] Supabase query notice:", error.message);
      return [];
    }

    const schedules = (data as DoctorSchedule[]) || [];

    // Sort in canonical Monday-Sunday order
    return schedules.sort((a, b) => {
      const idxA = DAYS_OF_WEEK.indexOf(a.day_of_week);
      const idxB = DAYS_OF_WEEK.indexOf(b.day_of_week);
      return idxA - idxB;
    });
  } catch (err) {
    console.error("[getDoctorSchedules] Failed to load doctor schedules:", err);
    return [];
  }
}

/**
 * Retrieves only active schedule records for a doctor.
 * Reusable patient/public query function for Phase 10+.
 * Strictly filters by is_active = true.
 */
export async function getActiveDoctorSchedule(doctorId: string): Promise<DoctorSchedule[]> {
  if (!doctorId) return [];

  try {
    const { data, error } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("is_active", true);

    if (error) {
      console.warn("[getActiveDoctorSchedule] Supabase query notice:", error.message);
      return [];
    }

    const schedules = (data as DoctorSchedule[]) || [];

    return schedules.sort((a, b) => {
      const idxA = DAYS_OF_WEEK.indexOf(a.day_of_week);
      const idxB = DAYS_OF_WEEK.indexOf(b.day_of_week);
      return idxA - idxB;
    });
  } catch (err) {
    console.error("[getActiveDoctorSchedule] Failed to load active schedule:", err);
    return [];
  }
}

/**
 * Alias for getActiveDoctorSchedule for patient discovery integration.
 */
export const getDoctorSchedule = getActiveDoctorSchedule;

/**
 * Saves or updates a doctor's schedule for a specific day of the week.
 * Enforces:
 * - Schema & business validation rules
 * - Authorization: Doctor can only modify their own schedule
 * - Conflict upsert on (doctor_id, day_of_week)
 */
export async function upsertDoctorSchedule(
  input: ScheduleInput,
  authenticatedDoctorId: string
): Promise<{ success: boolean; data?: DoctorSchedule; error?: string }> {
  // Authorization check
  if (!authenticatedDoctorId || input.doctor_id !== authenticatedDoctorId) {
    return {
      success: false,
      error: "Unauthorized: You can only configure schedule settings for your own doctor profile.",
    };
  }

  // Validation
  const validation = validateScheduleInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(" "),
    };
  }

  const payload = {
    doctor_id: input.doctor_id,
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
    break_start: input.break_start || null,
    break_end: input.break_end || null,
    appointment_duration: input.appointment_duration,
    is_active: input.is_active ?? true,
  };

  try {
    const { data, error } = await supabase
      .from("doctor_schedules")
      .upsert(payload, {
        onConflict: "doctor_id,day_of_week",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as DoctorSchedule };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected database error.";
    return { success: false, error: message };
  }
}

/**
 * Toggles a day's schedule active / inactive state.
 * Enforces ownership authorization.
 */
export async function toggleDoctorScheduleActive(
  scheduleId: string,
  isActive: boolean,
  authenticatedDoctorId: string
): Promise<{ success: boolean; error?: string }> {
  if (!scheduleId || !authenticatedDoctorId) {
    return { success: false, error: "Missing required schedule or doctor identifier." };
  }

  try {
    const { error } = await supabase
      .from("doctor_schedules")
      .update({ is_active: isActive })
      .eq("id", scheduleId)
      .eq("doctor_id", authenticatedDoctorId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle schedule status.";
    return { success: false, error: message };
  }
}

/**
 * Deletes a scheduled day.
 * Enforces ownership authorization.
 */
export async function deleteDoctorSchedule(
  scheduleId: string,
  authenticatedDoctorId: string
): Promise<{ success: boolean; error?: string }> {
  if (!scheduleId || !authenticatedDoctorId) {
    return { success: false, error: "Missing required schedule or doctor identifier." };
  }

  try {
    const { error } = await supabase
      .from("doctor_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("doctor_id", authenticatedDoctorId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete schedule.";
    return { success: false, error: message };
  }
}
