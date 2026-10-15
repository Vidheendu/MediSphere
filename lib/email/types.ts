export type EmailDeliveryReason =
  | "sent"
  | "missing_credentials"
  | "provider_error"
  | "already_sent"
  | "no_recipient"
  | "unauthorized";

export interface EmailDeliveryStatus {
  attempted: boolean;
  sent: boolean;
  reason?: EmailDeliveryReason;
  message?: string;
  messageId?: string;
}

export interface AppointmentConfirmationEmailData {
  appointmentId: string;
  patientName?: string | null;
  patientEmail: string;
  doctorName: string;
  speciality?: string | null;
  clinicName?: string | null;
  clinicAddress?: string | null;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  status: string;
  appointmentUrl: string;
}
