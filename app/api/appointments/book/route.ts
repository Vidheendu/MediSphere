import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Appointment } from "@/types";
import { formatBookingError, sendBookingNotifications } from "@/lib/services/appointments";
import { sendAppointmentConfirmationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Handles appointment booking submission on the server side:
 *
 * Sequence:
 * 1. Patient submits a booking request.
 * 2. Authenticates caller session via Supabase JWT.
 * 3. Database atomic RPC book_appointment validates slot, doctor, and locks slot FOR UPDATE.
 * 4. Appointment is created and slot becomes booked atomically.
 * 5. Server receives successful booking result.
 * 6. Server sends confirmation email using Resend (server-only).
 *
 * Guarantees:
 * - Failed bookings NEVER trigger an email.
 * - Email delivery failure NEVER undoes or rolls back a confirmed booking.
 * - Recipient is strictly derived from verified patient account/profile.
 * - Double-booking protection is preserved at database level.
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
          error: "You must be signed in as a patient to book an appointment.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    let body: { slotId?: string; reason?: string; notes?: string };
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

    const { slotId, reason, notes } = body;

    if (!slotId) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select a valid appointment slot.",
          code: "SLOT_REQUIRED",
        },
        { status: 400 }
      );
    }

    // 3. Initialize authenticated Supabase client for caller
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
          error: "You must be signed in as a patient to book an appointment.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const patientUser = authData.user;

    // 4. Execute atomic PostgreSQL stored procedure book_appointment
    const { data, error } = await supabase.rpc("book_appointment", {
      p_slot_id: slotId,
      p_reason: reason?.trim() ? reason.trim() : null,
      p_notes: notes?.trim() ? notes.trim() : null,
    });

    // If database booking fails, STOP HERE — never send a confirmation email
    if (error) {
      const formatted = formatBookingError(error.message);
      return NextResponse.json(
        {
          success: false,
          error: formatted.message,
          code: formatted.code,
        },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to confirm appointment. Please try again.",
          code: "NO_DATA",
        },
        { status: 500 }
      );
    }

    const appointment = (typeof data === "string" ? JSON.parse(data) : data) as Appointment;

    // 5. Trigger notifications for patient and doctor (idempotent, safe)
    try {
      await sendBookingNotifications(appointment);
    } catch (notifErr) {
      console.warn("[MediSphere Booking] Non-fatal notification error after booking:", notifErr);
    }

    // 6. Server received successful booking result -> Send confirmation email
    let emailDelivery;
    try {
      emailDelivery = await sendAppointmentConfirmationEmail({
        appointmentId: appointment.id,
        callerUserId: patientUser.id,
        recipientEmail: patientUser.email,
        supabaseClient: supabase,
      });
    } catch (emailErr) {
      console.error("[MediSphere Booking] Non-fatal email error after booking:", emailErr);
      emailDelivery = {
        attempted: true,
        sent: false,
        reason: "provider_error" as const,
        message: "Confirmation email could not be delivered at this time.",
      };
    }

    // 6. Return confirmed appointment and email delivery status to client
    return NextResponse.json(
      {
        success: true,
        appointment,
        emailDelivery,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const formatted = formatBookingError(rawMsg);
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
