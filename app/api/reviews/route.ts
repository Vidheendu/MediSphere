import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { DoctorReview } from "@/types";
import {
  validateReviewInput,
  formatReviewError,
} from "@/lib/services/reviews";

export const dynamic = "force-dynamic";

/**
 * Handles patient review submission on the server side:
 *
 * Sequence:
 * 1. Authenticates caller session via Supabase JWT Bearer token.
 * 2. Validates rating (1 to 5) and review text (max 1000 chars).
 * 3. PostgreSQL stored procedure submit_doctor_review validates:
 *    - Appointment existence and ownership by caller (auth.uid()).
 *    - Appointment status strictly 'completed'.
 *    - Single review per appointment (unique constraint).
 *    - Automatically links reviewed doctor_id from appointment record.
 * 4. Returns confirmed review object or appropriate error code.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in as a patient to submit a review.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    let body: { appointmentId?: string; rating?: number; reviewText?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload format.",
          code: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    const { appointmentId, rating, reviewText } = body;

    if (!appointmentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment reference is required to submit a review.",
          code: "APPOINTMENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (typeof rating !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Please select a rating between 1 and 5 stars.",
          code: "RATING_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Validate inputs
    const validation = validateReviewInput({
      rating,
      reviewText,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          code: validation.code,
        },
        { status: 400 }
      );
    }

    // 3. Initialize authenticated Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in as a patient to submit a review.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 4. Call atomic stored procedure submit_doctor_review
    const { data, error } = await supabase.rpc("submit_doctor_review", {
      p_appointment_id: appointmentId,
      p_rating: rating,
      p_review_text: reviewText?.trim() ? reviewText.trim() : null,
    });

    if (error) {
      const formatted = formatReviewError(error.message);
      const statusCode = formatted.code === "DUPLICATE_REVIEW" ? 409 : 400;

      return NextResponse.json(
        {
          success: false,
          error: formatted.message,
          code: formatted.code,
        },
        { status: statusCode }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to submit review. Please try again.",
          code: "NO_DATA",
        },
        { status: 500 }
      );
    }

    const review = (typeof data === "string" ? JSON.parse(data) : data) as DoctorReview;

    return NextResponse.json(
      {
        success: true,
        review,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const formatted = formatReviewError(rawMsg);
    return NextResponse.json(
      {
        success: false,
        error: formatted.message,
        code: formatted.code,
      },
      { status: 500 }
    );
  }
}
