import { supabase } from "@/lib/supabase";
import type {
  DoctorReview,
  PublicDoctorReview,
  DoctorRatingStats,
  AppointmentWithDetails,
  ReviewEligibilityResult,
} from "@/types";

export const MAX_REVIEW_TEXT_LENGTH = 1000;

/**
 * Validates rating and review text inputs.
 * Ensures rating is strictly an integer between 1 and 5,
 * and review text does not exceed the allowed maximum length.
 */
export function validateReviewInput(input: {
  rating: number;
  reviewText?: string | null;
}): { valid: boolean; error?: string; code?: string } {
  if (
    typeof input.rating !== "number" ||
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    return {
      valid: false,
      error: "Rating must be an integer between 1 and 5 stars.",
      code: "INVALID_RATING",
    };
  }

  if (input.reviewText && input.reviewText.length > MAX_REVIEW_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Review text cannot exceed ${MAX_REVIEW_TEXT_LENGTH} characters.`,
      code: "REVIEW_TOO_LONG",
    };
  }

  return { valid: true };
}

/**
 * Pure function to calculate rating stats from a list of reviews.
 * Safely handles zero reviews by returning averageRating = null.
 * Never produces a fabricated default rating (such as 5.0).
 */
export function calculateRatingStats(
  reviews: Array<{ rating: number }>
): DoctorRatingStats {
  const distribution: DoctorRatingStats["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!reviews || reviews.length === 0) {
    return {
      averageRating: null,
      totalReviews: 0,
      distribution,
    };
  }

  let sum = 0;
  for (const r of reviews) {
    const star = Math.round(r.rating);
    if (star >= 1 && star <= 5) {
      distribution[star as keyof typeof distribution] += 1;
      sum += star;
    }
  }

  const totalReviews = reviews.length;
  const rawAvg = sum / totalReviews;
  const averageRating = Math.round(rawAvg * 10) / 10;

  return {
    averageRating,
    totalReviews,
    distribution,
  };
}

/**
 * Evaluates patient review eligibility for a specific appointment.
 * Rules:
 * - Patient must be authenticated.
 * - Appointment must belong to that patient.
 * - Appointment status must strictly be 'completed'.
 * - No review has already been submitted for that appointment.
 */
export function checkAppointmentReviewEligibility(
  appointment: AppointmentWithDetails | null | undefined,
  existingReview?: DoctorReview | null,
  currentUserId?: string | null
): ReviewEligibilityResult {
  if (!appointment) {
    return {
      status: "not_completed",
      eligible: false,
      message: "Appointment record was not found.",
    };
  }

  if (!currentUserId) {
    return {
      status: "unauthenticated",
      eligible: false,
      message: "You must be signed in as a patient to review this appointment.",
    };
  }

  if (appointment.patient_id !== currentUserId) {
    return {
      status: "not_patient",
      eligible: false,
      message: "You can only review consultations booked under your account.",
    };
  }

  if (existingReview) {
    return {
      status: "already_reviewed",
      eligible: false,
      message: "You have already submitted a review for this consultation.",
      existingReview,
    };
  }

  if (appointment.status !== "completed") {
    let msg = "Only completed appointments can receive patient reviews.";
    if (appointment.status === "confirmed") {
      msg = "Your consultation is scheduled. You can submit a review once the doctor marks the visit as completed.";
    } else if (appointment.status === "cancelled") {
      msg = "Cancelled appointments cannot be reviewed.";
    } else if (appointment.status === "no_show") {
      msg = "No-show appointments cannot be reviewed.";
    }

    return {
      status: "not_completed",
      eligible: false,
      message: msg,
    };
  }

  return {
    status: "eligible",
    eligible: true,
    message: "Appointment is eligible for a patient review.",
  };
}

/**
 * Sanitizes reviewer name for public display to protect patient privacy.
 * Extracts only the first name or defaults to 'Verified Patient'.
 * Strictly guarantees no phone numbers, email addresses, or internal UUIDs are exposed.
 */
export function sanitizeReviewerDisplayName(rawName?: string | null): string {
  if (!rawName || typeof rawName !== "string") {
    return "Verified Patient";
  }

  const trimmed = rawName.trim();
  if (!trimmed) return "Verified Patient";

  // Use only first token of full name, capitalized
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  if (!firstName || firstName.length === 0) return "Verified Patient";

  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

/**
 * Formats database review errors into user-friendly messages.
 */
export function formatReviewError(rawError: string): { message: string; code: string } {
  const err = (rawError || "").toLowerCase();

  if (err.includes("duplicate") || err.includes("already been submitted") || err.includes("appointment_id_key")) {
    return {
      message: "You have already submitted a review for this appointment.",
      code: "DUPLICATE_REVIEW",
    };
  }

  if (err.includes("ineligible") || err.includes("only completed appointments")) {
    return {
      message: "Only completed appointments can receive reviews.",
      code: "INELIGIBLE_APPOINTMENT",
    };
  }

  if (err.includes("invalid_rating") || err.includes("between 1 and 5")) {
    return {
      message: "Rating must be an integer between 1 and 5 stars.",
      code: "INVALID_RATING",
    };
  }

  if (err.includes("review_too_long") || err.includes("1000 characters")) {
    return {
      message: `Review text cannot exceed ${MAX_REVIEW_TEXT_LENGTH} characters.`,
      code: "REVIEW_TOO_LONG",
    };
  }

  if (err.includes("unauthorized") || err.includes("patient_mismatch") || err.includes("your account")) {
    return {
      message: "You can only review consultations booked under your account.",
      code: "UNAUTHORIZED",
    };
  }

  if (err.includes("auth_required") || err.includes("authentication required")) {
    return {
      message: "Please sign in to submit a review.",
      code: "AUTH_REQUIRED",
    };
  }

  return {
    message: rawError || "Failed to submit review. Please try again.",
    code: "SUBMIT_FAILED",
  };
}

/**
 * Retrieves the review for a specific appointment, if one exists.
 */
export async function getReviewForAppointment(
  appointmentId: string,
  customClient = supabase
): Promise<DoctorReview | null> {
  if (!appointmentId) return null;

  try {
    const { data, error } = await customClient
      .from("doctor_reviews")
      .select("id, doctor_id, patient_id, appointment_id, rating, review_text, created_at, updated_at")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (error) {
      console.warn(`[getReviewForAppointment] Query error for appointment ${appointmentId}:`, error.message);
      return null;
    }

    return (data as unknown as DoctorReview) ?? null;
  } catch (err) {
    console.error(`[getReviewForAppointment] Failed to fetch review for appointment ${appointmentId}:`, err);
    return null;
  }
}

/**
 * Retrieves published reviews for a doctor.
 * Employs privacy-safe projection: exposes rating, review_text, created_at,
 * and a sanitized display name.
 * Strictly avoids exposing patient email, phone, authentication IDs, or appointment notes.
 */
export async function getDoctorReviews(
  doctorId: string,
  customClient = supabase
): Promise<PublicDoctorReview[]> {
  if (!doctorId) return [];

  try {
    // 1. First attempt to query the secure view doctor_public_reviews
    const { data: viewData, error: viewError } = await customClient
      .from("doctor_public_reviews")
      .select("id, doctor_id, rating, review_text, created_at, patient_display_name")
      .eq("doctor_id", doctorId)
      .order("created_at", { ascending: false });

    if (!viewError && Array.isArray(viewData)) {
      return viewData as PublicDoctorReview[];
    }

    // 2. Fallback: query doctor_reviews directly and join safe profile fields only
    const { data, error } = await customClient
      .from("doctor_reviews")
      .select("id, doctor_id, rating, review_text, created_at, profile:profiles(full_name)")
      .eq("doctor_id", doctorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(`[getDoctorReviews] Query error for doctor ${doctorId}:`, error.message);
      return [];
    }

    const reviews = (data || []) as unknown as Array<{
      id: string;
      doctor_id: string;
      rating: number;
      review_text: string | null;
      created_at: string;
      profile?: { full_name?: string | null } | null;
    }>;

    return reviews.map((r) => ({
      id: r.id,
      doctor_id: r.doctor_id,
      rating: r.rating,
      review_text: r.review_text,
      created_at: r.created_at,
      patient_display_name: sanitizeReviewerDisplayName(r.profile?.full_name),
    }));
  } catch (err) {
    console.error(`[getDoctorReviews] Failed to fetch doctor reviews for ${doctorId}:`, err);
    return [];
  }
}

/**
 * Retrieves aggregated rating metrics for a doctor based on actual MediSphere reviews.
 * Safely handles 0 reviews by returning averageRating = null.
 */
export async function getDoctorRatingStats(
  doctorId: string,
  customClient = supabase
): Promise<DoctorRatingStats> {
  if (!doctorId) {
    return {
      averageRating: null,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  try {
    // 1. Try atomic stored procedure get_doctor_rating_stats
    const { data: rpcData, error: rpcError } = await customClient.rpc(
      "get_doctor_rating_stats",
      { p_doctor_id: doctorId }
    );

    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
      return {
        averageRating: typeof parsed.average_rating === "number" ? parsed.average_rating : null,
        totalReviews: typeof parsed.total_reviews === "number" ? parsed.total_reviews : 0,
        distribution: {
          1: parsed.distribution?.["1"] ?? 0,
          2: parsed.distribution?.["2"] ?? 0,
          3: parsed.distribution?.["3"] ?? 0,
          4: parsed.distribution?.["4"] ?? 0,
          5: parsed.distribution?.["5"] ?? 0,
        },
      };
    }

    // 2. Fallback: fetch ratings directly and calculate in memory
    const { data, error } = await customClient
      .from("doctor_reviews")
      .select("rating")
      .eq("doctor_id", doctorId);

    if (error || !data) {
      return {
        averageRating: null,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    return calculateRatingStats(data as Array<{ rating: number }>);
  } catch (err) {
    console.error(`[getDoctorRatingStats] Error fetching rating stats for doctor ${doctorId}:`, err);
    return {
      averageRating: null,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
}

/**
 * Submits a new review for a completed appointment.
 * Supports both client-side invocation with active Supabase session
 * and direct RPC invocation.
 */
export async function submitReview(
  input: {
    appointmentId: string;
    rating: number;
    reviewText?: string | null;
  },
  customClient = supabase
): Promise<{ success: boolean; review?: DoctorReview; error?: string; code?: string }> {
  // 1. Validate inputs
  const validation = validateReviewInput({
    rating: input.rating,
    reviewText: input.reviewText,
  });

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      code: validation.code,
    };
  }

  if (!input.appointmentId) {
    return {
      success: false,
      error: "Appointment reference is required.",
      code: "APPOINTMENT_REQUIRED",
    };
  }

  try {
    // 2. Execute atomic PostgreSQL RPC submit_doctor_review
    const { data, error } = await customClient.rpc("submit_doctor_review", {
      p_appointment_id: input.appointmentId,
      p_rating: input.rating,
      p_review_text: input.reviewText?.trim() ? input.reviewText.trim() : null,
    });

    if (error) {
      const formatted = formatReviewError(error.message);
      return {
        success: false,
        error: formatted.message,
        code: formatted.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Failed to submit review. No confirmation returned from database.",
        code: "NO_DATA",
      };
    }

    const review = (typeof data === "string" ? JSON.parse(data) : data) as DoctorReview;

    return {
      success: true,
      review,
    };
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    const formatted = formatReviewError(raw);
    return {
      success: false,
      error: formatted.message,
      code: formatted.code,
    };
  }
}
