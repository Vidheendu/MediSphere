import type { AppointmentConfirmationEmailData } from "./types";
import {
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
} from "@/lib/services/appointments";

/**
 * Escapes HTML characters in user-provided or database text to prevent XSS/injection.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a clean, professional, responsive HTML email for appointment confirmation.
 * Compatible with mobile, desktop, and standard webmail clients.
 */
export function generateAppointmentConfirmationHtml(
  data: AppointmentConfirmationEmailData
): string {
  const patientGreeting = data.patientName?.trim()
    ? `Dear ${escapeHtml(data.patientName.trim())},`
    : "Hello,";

  const formattedDate = formatAppointmentDateIST(data.appointmentDate, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const startTimeStr = formatAppointmentTimeIST(data.startTime);
  const endTimeStr = formatAppointmentTimeIST(data.endTime);
  const formattedTimeRange = startTimeStr && endTimeStr ? `${startTimeStr} – ${endTimeStr} (IST)` : "";

  const escapedDoctor = escapeHtml(data.doctorName);
  const escapedSpeciality = escapeHtml(data.speciality || "");
  const escapedClinicName = escapeHtml(data.clinicName || "");
  const escapedClinicAddress = escapeHtml(data.clinicAddress || "");
  const escapedApptId = escapeHtml(data.appointmentId);
  const escapedStatus = escapeHtml(data.status ? data.status.toUpperCase() : "CONFIRMED");
  const escapedApptUrl = escapeHtml(data.appointmentUrl);

  const specialityRow = escapedSpeciality
    ? `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Speciality</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${escapedSpeciality}</td>
      </tr>`
    : "";

  const clinicRow = escapedClinicName
    ? `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; vertical-align: top;">Clinic</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; text-align: right;">
          <div style="font-weight: 600;">${escapedClinicName}</div>
          ${escapedClinicAddress ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${escapedClinicAddress}</div>` : ""}
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed - MediSphere</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0d9488; padding: 32px 24px; text-align: center; color: #ffffff;">
              <div style="display: inline-block; padding: 8px 16px; background-color: rgba(255, 255, 255, 0.15); border-radius: 9999px; margin-bottom: 12px;">
                <span style="font-size: 14px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #ffffff;">MediSphere Healthcare</span>
              </div>
              <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em;">
                Appointment Confirmed
              </h1>
              <p style="margin: 0; font-size: 14px; color: #ccfbf1;">
                Your appointment has been successfully scheduled and secured.
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                ${patientGreeting}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                Your consultation has been confirmed in the MediSphere system. Please review the details below:
              </p>

              <!-- Appointment Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
                <!-- Appointment ID -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Appointment ID</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="font-family: monospace; font-size: 13px; font-weight: 600; color: #0f172a; background-color: #ffffff; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
                      ${escapedApptId}
                    </span>
                  </td>
                </tr>

                <!-- Status -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Status</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="display: inline-block; padding: 3px 10px; background-color: #ecfdf5; color: #065f46; font-size: 12px; font-weight: 700; border-radius: 9999px; border: 1px solid #a7f3d0;">
                      ✓ ${escapedStatus}
                    </span>
                  </td>
                </tr>

                <!-- Doctor -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Doctor</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${escapedDoctor}</td>
                </tr>

                <!-- Speciality (Optional) -->
                ${specialityRow}

                <!-- Clinic (Optional) -->
                ${clinicRow}

                <!-- Date -->
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Date</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 700; text-align: right;">${formattedDate}</td>
                </tr>

                <!-- Time -->
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Time Window</td>
                  <td style="padding: 10px 0; color: #0d9488; font-size: 14px; font-weight: 700; text-align: right;">${formattedTimeRange}</td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${escapedApptUrl}" style="display: inline-block; padding: 14px 28px; background-color: #0d9488; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                      View Appointment in Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
                Please arrive at the clinic 10 minutes prior to your scheduled consultation time.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                MediSphere Healthcare Network &bull; Bhopal, Madhya Pradesh
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                This is an automated confirmation sent to your registered account email. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates an accessible plain-text fallback representation of the confirmation email.
 */
export function generateAppointmentConfirmationText(
  data: AppointmentConfirmationEmailData
): string {
  const patientGreeting = data.patientName?.trim()
    ? `Dear ${data.patientName.trim()},`
    : "Hello,";

  const formattedDate = formatAppointmentDateIST(data.appointmentDate, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const startTimeStr = formatAppointmentTimeIST(data.startTime);
  const endTimeStr = formatAppointmentTimeIST(data.endTime);
  const timeRange = startTimeStr && endTimeStr ? `${startTimeStr} – ${endTimeStr} (IST)` : "";

  const lines = [
    "==================================================",
    "MEDISPHERE — APPOINTMENT CONFIRMATION",
    "==================================================",
    "",
    patientGreeting,
    "",
    "Your appointment has been successfully scheduled and confirmed.",
    "",
    "APPOINTMENT DETAILS:",
    `Appointment ID : ${data.appointmentId}`,
    `Status         : ${data.status ? data.status.toUpperCase() : "CONFIRMED"}`,
    `Doctor         : ${data.doctorName}`,
  ];

  if (data.speciality) {
    lines.push(`Speciality     : ${data.speciality}`);
  }

  if (data.clinicName) {
    lines.push(`Clinic         : ${data.clinicName}`);
  }

  if (data.clinicAddress) {
    lines.push(`Address        : ${data.clinicAddress}`);
  }

  lines.push(`Date           : ${formattedDate}`);
  lines.push(`Time Window    : ${timeRange}`);
  lines.push("");
  lines.push(`View Appointment Details: ${data.appointmentUrl}`);
  lines.push("");
  lines.push("Please arrive 10 minutes prior to your scheduled consultation time.");
  lines.push("");
  lines.push("--------------------------------------------------");
  lines.push("MediSphere Healthcare Network • Bhopal, Madhya Pradesh");
  lines.push("This is an automated confirmation sent to your registered account.");
  lines.push("==================================================");

  return lines.join("\n");
}
