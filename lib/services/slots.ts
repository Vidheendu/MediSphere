import { supabase } from "@/lib/supabase";
import {
  getActiveDoctorSchedule,
  timeToMinutes,
} from "@/lib/services/schedules";
import type { AppointmentSlot, DayOfWeek, SlotStatus } from "@/types";

/**
 * Standard timezone for MediSphere in Bhopal, Madhya Pradesh, India.
 * All scheduling and slot calculation logic is strictly evaluated in Asia/Kolkata (IST, UTC+05:30).
 */
export const TIMEZONE = "Asia/Kolkata";

/**
 * Maximum days ahead permitted for batch slot generation.
 */
export const MAX_GENERATION_DAYS = 30;

export interface GeneratedSlotCandidate {
  doctor_id: string;
  slot_date: string;  // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  status: SlotStatus;
}

export interface SlotGenerationSummary {
  success: boolean;
  generatedCount: number;
  skippedExistingCount: number;
  totalSlotsForRange: number;
  error?: string;
}

/**
 * Formats total minutes from midnight into "HH:MM" string format.
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Returns the current date in Asia/Kolkata timezone formatted as "YYYY-MM-DD".
 * Avoids any local machine UTC shift.
 */
export function getCurrentDateIST(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Returns current minutes from midnight in Asia/Kolkata timezone (0 - 1439).
 */
export function getCurrentMinutesIST(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.format(new Date()).split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Returns current time string in Asia/Kolkata timezone formatted as "HH:MM".
 */
export function getCurrentTimeIST(): string {
  return minutesToTime(getCurrentMinutesIST());
}

/**
 * Determines the canonical DayOfWeek for a given "YYYY-MM-DD" date in Asia/Kolkata.
 */
export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const parts = dateStr.trim().split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // Use noon UTC to avoid date edge rollover across timezones
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
  });

  return formatter.format(utcDate) as DayOfWeek;
}

/**
 * Generates date strings sequentially from startDate to endDate (inclusive).
 * Dates must be formatted as "YYYY-MM-DD".
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
  const [eYear, eMonth, eDay] = endDate.split("-").map(Number);

  const start = new Date(Date.UTC(sYear, sMonth - 1, sDay, 12, 0, 0));
  const end = new Date(Date.UTC(eYear, eMonth - 1, eDay, 12, 0, 0));

  if (start > end) return [];

  const current = new Date(start);
  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, "0");
    const d = String(current.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Computes slot candidates for a single date given a doctor's active schedule configuration.
 *
 * Enforces:
 * 1. Shifts: slots start at start_time and fit completely within end_time.
 * 2. Break Exclusion: slots overlapping break_start to break_end are skipped completely.
 * 3. Future Guarantee: For today's date in Asia/Kolkata, slots in the past are excluded.
 * 4. Past Dates: Dates prior to today in Asia/Kolkata yield 0 slots.
 */
export function computeSlotsForSchedule(
  doctorId: string,
  slotDate: string,
  schedule: {
    start_time: string;
    end_time: string;
    break_start?: string | null;
    break_end?: string | null;
    appointment_duration: number;
    is_active: boolean;
  }
): GeneratedSlotCandidate[] {
  if (!schedule.is_active) return [];

  const todayIST = getCurrentDateIST();
  if (slotDate < todayIST) {
    // Never generate slots for past dates
    return [];
  }

  const isToday = slotDate === todayIST;
  const currentMinutesIST = getCurrentMinutesIST();

  const startMin = timeToMinutes(schedule.start_time);
  const endMin = timeToMinutes(schedule.end_time);
  const duration = schedule.appointment_duration;

  if (duration <= 0 || endMin <= startMin) return [];

  const hasBreak = Boolean(
    schedule.break_start &&
    schedule.break_end &&
    schedule.break_start.trim().length > 0 &&
    schedule.break_end.trim().length > 0
  );

  const breakStartMin = hasBreak ? timeToMinutes(schedule.break_start!) : -1;
  const breakEndMin = hasBreak ? timeToMinutes(schedule.break_end!) : -1;

  const candidates: GeneratedSlotCandidate[] = [];
  let cursor = startMin;

  while (cursor + duration <= endMin) {
    const slotStart = cursor;
    const slotEnd = cursor + duration;

    // Check if slot overlaps the break period
    const overlapsBreak =
      hasBreak &&
      slotStart < breakEndMin &&
      slotEnd > breakStartMin;

    if (overlapsBreak) {
      // Fast forward past the break period
      cursor = Math.max(cursor + duration, breakEndMin);
      continue;
    }

    // Check if slot is already in the past for today's date
    if (isToday && slotStart <= currentMinutesIST) {
      cursor = slotEnd;
      continue;
    }

    candidates.push({
      doctor_id: doctorId,
      slot_date: slotDate,
      start_time: minutesToTime(slotStart),
      end_time: minutesToTime(slotEnd),
      status: "available",
    });

    cursor = slotEnd;
  }

  return candidates;
}

/**
 * Converts a doctor's configured recurring weekly schedule into date-specific appointment slots.
 *
 * Rules:
 * - Read doctor's active schedules.
 * - Map each date in the range to its day_of_week.
 * - Generate slots excluding breaks and past time slots.
 * - Prevent duplicates: preserves already existing slots (including booked/blocked).
 * - Restricts date range to MAX_GENERATION_DAYS.
 */
export async function generateDoctorSlots(
  doctorId: string,
  startDate: string,
  endDate: string,
  authenticatedDoctorId?: string
): Promise<SlotGenerationSummary> {
  if (!doctorId) {
    return {
      success: false,
      generatedCount: 0,
      skippedExistingCount: 0,
      totalSlotsForRange: 0,
      error: "Missing required doctor ID.",
    };
  }

  // Authorization check if provided
  if (authenticatedDoctorId && doctorId !== authenticatedDoctorId) {
    return {
      success: false,
      generatedCount: 0,
      skippedExistingCount: 0,
      totalSlotsForRange: 0,
      error: "Unauthorized: You can only generate appointment slots for your own doctor profile.",
    };
  }

  const todayIST = getCurrentDateIST();
  if (endDate < startDate) {
    return {
      success: false,
      generatedCount: 0,
      skippedExistingCount: 0,
      totalSlotsForRange: 0,
      error: "End date must be greater than or equal to start date.",
    };
  }

  // Prevent past-only ranges
  if (endDate < todayIST) {
    return {
      success: false,
      generatedCount: 0,
      skippedExistingCount: 0,
      totalSlotsForRange: 0,
      error: "Cannot generate appointment slots for dates in the past.",
    };
  }

  // Effective start date is at least today
  const effectiveStart = startDate < todayIST ? todayIST : startDate;
  const dateList = getDateRange(effectiveStart, endDate);

  if (dateList.length > MAX_GENERATION_DAYS) {
    return {
      success: false,
      generatedCount: 0,
      skippedExistingCount: 0,
      totalSlotsForRange: 0,
      error: `Requested range (${dateList.length} days) exceeds maximum allowed limit of ${MAX_GENERATION_DAYS} days.`,
    };
  }

  // 1. Fetch doctor's active schedules
  const activeSchedules = await getActiveDoctorSchedule(doctorId);
  if (activeSchedules.length === 0) {
    return {
      success: true,
      generatedCount: 0,
      skippedExistingCount: 0,
      totalSlotsForRange: 0,
      error: "Doctor has no active schedule configured. Configure working days before generating slots.",
    };
  }

  // 2. Fetch existing slots in the range to avoid duplicate inserts
  const { data: existingData, error: fetchError } = await supabase
    .from("appointment_slots")
    .select("slot_date, start_time, status")
    .eq("doctor_id", doctorId)
    .gte("slot_date", effectiveStart)
    .lte("slot_date", endDate);

  if (fetchError) {
    console.warn("[generateDoctorSlots] Existing slots query warning:", fetchError.message);
  }

  const existingMap = new Set<string>();
  if (existingData) {
    existingData.forEach((row) => {
      // Normalize start_time to HH:MM
      const st = row.start_time.slice(0, 5);
      existingMap.add(`${row.slot_date}_${st}`);
    });
  }

  // 3. Compute slot candidates across dates
  const newSlotsToInsert: GeneratedSlotCandidate[] = [];
  let skippedCount = 0;

  for (const date of dateList) {
    const dayOfWeek = getDayOfWeekFromDate(date);
    const daySchedule = activeSchedules.find(
      (s) => s.day_of_week === dayOfWeek && s.is_active
    );

    if (!daySchedule) {
      // Doctor is not working on this day of week
      continue;
    }

    const dayCandidates = computeSlotsForSchedule(doctorId, date, daySchedule);

    for (const candidate of dayCandidates) {
      const key = `${candidate.slot_date}_${candidate.start_time}`;
      if (existingMap.has(key)) {
        skippedCount++;
      } else {
        newSlotsToInsert.push(candidate);
      }
    }
  }

  // 4. Batch insert new slots into Supabase
  if (newSlotsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("appointment_slots")
      .insert(newSlotsToInsert);

    if (insertError) {
      return {
        success: false,
        generatedCount: 0,
        skippedExistingCount: skippedCount,
        totalSlotsForRange: existingMap.size,
        error: insertError.message,
      };
    }
  }

  return {
    success: true,
    generatedCount: newSlotsToInsert.length,
    skippedExistingCount: skippedCount,
    totalSlotsForRange: existingMap.size + newSlotsToInsert.length,
  };
}

/**
 * Retrieves all appointment slots for a doctor on a specific date (Doctor Workspace view).
 * Returns available, booked, and blocked slots ordered chronologically.
 */
export async function getDoctorSlotsByDate(
  doctorId: string,
  date: string
): Promise<AppointmentSlot[]> {
  if (!doctorId || !date) return [];

  try {
    const { data, error } = await supabase
      .from("appointment_slots")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("slot_date", date)
      .order("start_time", { ascending: true });

    if (error) {
      console.warn("[getDoctorSlotsByDate] Supabase query notice:", error.message);
      return [];
    }

    return (data as AppointmentSlot[]) || [];
  } catch (err) {
    console.error("[getDoctorSlotsByDate] Failed to load slots:", err);
    return [];
  }
}

/**
 * Retrieves publicly available slots for a doctor on a specific date (Patient Discovery view).
 *
 * Strictly enforces:
 * - Doctor verification_status = "verified" (Pending imported doctors are NOT publicly bookable)
 * - Slot status = "available"
 * - Slot start_time is in the future for today's date in Asia/Kolkata
 * - Does NOT return blocked or booked slots
 */
export async function getAvailableSlots(
  doctorId: string,
  date: string
): Promise<AppointmentSlot[]> {
  if (!doctorId || !date) return [];

  const todayIST = getCurrentDateIST();
  if (date < todayIST) {
    // Past dates have 0 available slots
    return [];
  }

  try {
    // 1. Verify doctor verification status
    const { data: docData, error: docError } = await supabase
      .from("doctors")
      .select("id, verification_status")
      .eq("id", doctorId)
      .maybeSingle();

    if (docError || !docData || docData.verification_status !== "verified") {
      // Pending, rejected, or unverified doctors are not publicly bookable
      return [];
    }

    // 2. Fetch available slots
    const { data, error } = await supabase
      .from("appointment_slots")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("slot_date", date)
      .eq("status", "available")
      .order("start_time", { ascending: true });

    if (error) {
      console.warn("[getAvailableSlots] Query notice:", error.message);
      return [];
    }

    let slots = (data as AppointmentSlot[]) || [];

    // Filter past slots if querying for today
    if (date === todayIST) {
      const currentMin = getCurrentMinutesIST();
      slots = slots.filter((slot) => {
        const startMin = timeToMinutes(slot.start_time);
        return startMin > currentMin;
      });
    }

    return slots;
  } catch (err) {
    console.error("[getAvailableSlots] Exception:", err);
    return [];
  }
}

/**
 * Allows a doctor to block or unblock an available slot.
 * Blocked slots are preserved in the database for audit/history and hidden from patient search.
 *
 * Rules:
 * - Doctors can only block/unblock their own slots.
 * - Cannot block/unblock already 'booked' slots.
 */
export async function toggleSlotBlocked(
  slotId: string,
  doctorId: string,
  block: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!slotId || !doctorId) {
    return { success: false, error: "Missing required slot or doctor identifier." };
  }

  const targetStatus: SlotStatus = block ? "blocked" : "available";

  try {
    const { data: slot, error: fetchError } = await supabase
      .from("appointment_slots")
      .select("id, doctor_id, status")
      .eq("id", slotId)
      .eq("doctor_id", doctorId)
      .maybeSingle();

    if (fetchError || !slot) {
      return { success: false, error: "Slot not found or unauthorized." };
    }

    if (slot.status === "booked") {
      return {
        success: false,
        error: "Cannot block or modify a slot with an active appointment booking.",
      };
    }

    const { error: updateError } = await supabase
      .from("appointment_slots")
      .update({ status: targetStatus })
      .eq("id", slotId)
      .eq("doctor_id", doctorId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle slot blocked status.";
    return { success: false, error: message };
  }
}
