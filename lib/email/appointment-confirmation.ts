import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppointmentWithDetails } from "@/types";
import type {
  EmailDeliveryStatus,
  AppointmentConfirmationEmailData,
} from "./types";
import {
  isResendConfigured,
  getResendClient,
  getSenderEmail,
  getAppBaseUrl,
} from "./resend";
import {
  generateAppointmentConfirmationHtml,
  generateAppointmentConfirmationText,
} from "./template";
import { supabase as defaultSupabase } from "@/lib/supabase";

/**
 * In-memory registry of appointment IDs for which a confirmation email has already been sent.
 * Prevents accidental duplicate sends caused by network retries or multiple concurrent requests.
 */
const sentAppointmentEmailIds = new Set<string>();

/**
 * Checks whether a confirmation email has already been sent for an appointment.
 */
export function hasConfirmationBeenSent(appointmentId: string): boolean {
  return sentAppointmentEmailIds.has(appointmentId);
}

/**
 * Marks an appointment ID as having sent a confirmation email.
 */
export function markConfirmationAsSent(appointmentId: string): void {
  sentAppointmentEmailIds.add(appointmentId);
}

/**
 * Clears the sent email cache. Useful for testing environments.
 */
export function resetConfirmationEmailCache(): void {
  sentAppointmentEmailIds.clear();
}

export interface SendConfirmationEmailParams {
  appointmentId: string;
  callerUserId: string; // The authenticated user ID triggering the email (must match patient_id)
  recipientEmail?: string | null; // Verified account email of the patient
  appointmentData?: AppointmentWithDetails | null; // Optional pre-fetched appointment record
  supabaseClient?: SupabaseClient<Database>; // Optional Supabase client instance
}

/**
 * Sends a transactional confirmation email for a confirmed MediSphere appointment.
 *
 * Enforces:
 * 1. Strict caller ownership (callerUserId must match appointment.patient_id)
 * 2. Recipient comes exclusively from authenticated patient account / profile
 * 3. Server-side Resend execution (never exposed to browser)
 * 4. Duplicate send prevention
 * 5. Safe failure handling (catches errors, never throws, never corrupts booking state)
 * 6. Asia/Kolkata date and time formatting
 * 7. HTML injection prevention via character escaping
 */
export async function sendAppointmentConfirmationEmail(
  params: SendConfirmationEmailParams
): Promise<EmailDeliveryStatus> {
  const {
    appointmentId,
    callerUserId,
    recipientEmail: providedRecipientEmail,
    appointmentData: initialAppointmentData,
    supabaseClient = defaultSupabase,
  } = params;

  if (!appointmentId) {
    return {
      attempted: false,
      sent: false,
      reason: "provider_error",
      message: "Appointment ID is required to send confirmation email.",
    };
  }

  try {
    // 1. Fetch or verify appointment details
    let appt: AppointmentWithDetails | null = initialAppointmentData || null;

    if (!appt || !appt.doctor) {
      const { data, error } = await supabaseClient
        .from("appointments")
        .select(`
          id,
          patient_id,
          doctor_id,
          slot_id,
          appointment_date,
          start_time,
          end_time,
          status,
          created_at,
          updated_at,
          doctor:doctors(
            id,
            qualification,
            profile:profiles(id, full_name, email),
            speciality:specialities(id, name),
            clinic:clinics(id, name, address, city, state, pincode)
          )
        `)
        .eq("id", appointmentId)
        .maybeSingle();

      if (error || !data) {
        console.warn("[MediSphere Email] Failed to retrieve appointment details:", error?.message);
        return {
          attempted: false,
          sent: false,
          reason: "provider_error",
          message: "Unable to retrieve verified appointment details from database.",
        };
      }

      appt = data as unknown as AppointmentWithDetails;
    }

    // 2. Security Check: Enforce patient ownership
    // A user cannot trigger or request confirmation emails for another patient's appointment
    if (appt.patient_id !== callerUserId) {
      console.warn(
        `[MediSphere Email] Security violation: User ${callerUserId} attempted to trigger email for appointment ${appointmentId} belonging to ${appt.patient_id}`
      );
      return {
        attempted: false,
        sent: false,
        reason: "unauthorized",
        message: "You are not authorized to access or request emails for this appointment.",
      };
    }

    // 3. Idempotency Check: Prevent duplicate email sends
    if (hasConfirmationBeenSent(appointmentId)) {
      return {
        attempted: false,
        sent: false,
        reason: "already_sent",
        message: "Confirmation email has already been sent for this appointment.",
      };
    }

    // 4. Determine verified recipient email
    let recipientEmail = providedRecipientEmail?.trim() || "";

    // If not provided in params, fetch from authenticated user's profile
    if (!recipientEmail) {
      const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", appt.patient_id)
        .maybeSingle();

      if (profileData?.email) {
        recipientEmail = profileData.email.trim();
      }
    }

    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.warn("[MediSphere Email] No valid recipient email found for patient:", appt.patient_id);
      return {
        attempted: false,
        sent: false,
        reason: "no_recipient",
        message: "The patient account does not have a valid email address configured.",
      };
    }

    // 5. Fetch patient name if available
    let patientName: string | null = null;
    if (appt.patient?.full_name) {
      patientName = appt.patient.full_name;
    } else {
      const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("full_name")
        .eq("id", appt.patient_id)
        .maybeSingle();
      if (profileData?.full_name) {
        patientName = profileData.full_name;
      }
    }

    // 6. Check Resend configuration
    if (!isResendConfigured()) {
      console.info(
        `[MediSphere Email] RESEND_API_KEY is not configured. Skipping email delivery for appointment ${appointmentId}.`
      );
      return {
        attempted: false,
        sent: false,
        reason: "missing_credentials",
        message: "Email delivery service is currently not configured in this environment.",
      };
    }

    const resend = getResendClient();
    if (!resend) {
      return {
        attempted: false,
        sent: false,
        reason: "missing_credentials",
        message: "Resend client could not be initialized.",
      };
    }

    // 7. Format doctor and clinic details from trusted database record
    const docProfile = appt.doctor?.profile;
    const rawDoctorName = docProfile?.full_name || "Verified Practitioner";
    const doctorName = rawDoctorName.toLowerCase().startsWith("dr.")
      ? rawDoctorName
      : `Dr. ${rawDoctorName}`;

    const speciality = appt.doctor?.speciality?.name || null;
    const clinic = appt.doctor?.clinic;
    const clinicName = clinic?.name || null;
    
    // Build address without trailing commas/empty values
    let clinicAddress: string | null = null;
    if (clinic) {
      const addrParts = [clinic.address, clinic.city, clinic.state, clinic.pincode]
        .filter(Boolean)
        .map((p) => String(p).trim())
        .filter((p) => p.length > 0);
      if (addrParts.length > 0) {
        clinicAddress = addrParts.join(", ");
      }
    }

    const baseUrl = getAppBaseUrl();
    const appointmentUrl = `${baseUrl}/dashboard/appointments/${appt.id}`;

    const emailPayload: AppointmentConfirmationEmailData = {
      appointmentId: appt.id,
      patientName,
      patientEmail: recipientEmail,
      doctorName,
      speciality,
      clinicName,
      clinicAddress,
      appointmentDate: appt.appointment_date,
      startTime: appt.start_time,
      endTime: appt.end_time,
      status: appt.status || "confirmed",
      appointmentUrl,
    };

    const htmlContent = generateAppointmentConfirmationHtml(emailPayload);
    const textContent = generateAppointmentConfirmationText(emailPayload);
    const fromAddress = getSenderEmail();
    const subject = `Appointment Confirmed: ${doctorName} on ${appt.appointment_date}`;

    // 8. Dispatch email via Resend
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: fromAddress,
      to: [recipientEmail],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (resendError) {
      // Log delivery failure safely without exposing sensitive secrets or raw provider internals
      console.error(
        `[MediSphere Email] Delivery failure for appointment ${appointmentId}: ${resendError.message}`
      );
      return {
        attempted: true,
        sent: false,
        reason: "provider_error",
        message: "Confirmation email could not be delivered by the email provider.",
      };
    }

    // 9. Successfully sent!
    markConfirmationAsSent(appointmentId);
    console.info(
      `[MediSphere Email] Confirmation email sent successfully for appointment ${appointmentId} to ${recipientEmail} (ID: ${resendData?.id})`
    );

    return {
      attempted: true,
      sent: true,
      reason: "sent",
      message: "Confirmation email sent successfully.",
      messageId: resendData?.id,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[MediSphere Email] Unexpected delivery error for appointment ${appointmentId}:`, errorMsg);
    return {
      attempted: true,
      sent: false,
      reason: "provider_error",
      message: "An unexpected error occurred while sending the confirmation email.",
    };
  }
}
