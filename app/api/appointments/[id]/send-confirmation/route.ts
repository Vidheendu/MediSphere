import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendAppointmentConfirmationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Endpoint allowing an authenticated patient to trigger or resend an appointment confirmation email.
 *
 * Security:
 * - Requires authenticated user session via Bearer token.
 * - Caller must own the appointment (appointment.patient_id === user.id).
 * - Patient B cannot request emails for Patient A's appointment (rejected with 403 Forbidden).
 * - Arbitrary recipient email is NOT accepted; recipient is derived exclusively from patient account.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await context.params;

    if (!appointmentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment ID is required.",
          code: "APPOINTMENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    // 1. Verify caller authentication
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

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
          error: "Invalid or expired authentication session.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 2. Fetch appointment to verify ownership
    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptError || !appt) {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment not found.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 3. Security: Enforce ownership
    if (appt.patient_id !== authData.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorized to request emails for this appointment.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // 4. Send email
    const emailResult = await sendAppointmentConfirmationEmail({
      appointmentId,
      callerUserId: authData.user.id,
      recipientEmail: authData.user.email,
      supabaseClient: supabase,
    });

    return NextResponse.json(
      {
        success: emailResult.sent,
        emailDelivery: emailResult,
      },
      { status: emailResult.sent ? 200 : 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-confirmation] Unexpected error:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process email request.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
