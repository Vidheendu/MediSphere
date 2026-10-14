"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DoctorDashboardNav from "@/components/dashboard/DoctorDashboardNav";
import { getOrCreateDoctorForProfile } from "@/lib/services/schedules";
import {
  getDoctorAppointmentById,
  updateDoctorAppointmentStatus,
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  isAppointmentUpcoming,
} from "@/lib/services/appointments";
import type { AppointmentWithDetails, Doctor } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorAppointmentDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.id;

  const { profile } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notFoundOrUnauthorized, setNotFoundOrUnauthorized] = useState(false);

  // User feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileId = profile?.id;

  useEffect(() => {
    let ignore = false;
    if (!profileId || !appointmentId) return;

    async function initializeDetails() {
      try {
        const doc = await getOrCreateDoctorForProfile(profileId!);
        if (ignore) return;
        setDoctor(doc);

        if (!doc?.id) {
          if (!ignore) setNotFoundOrUnauthorized(true);
          return;
        }

        const appt = await getDoctorAppointmentById(appointmentId, doc.id);
        if (ignore) return;

        if (!appt) {
          setNotFoundOrUnauthorized(true);
          return;
        }

        setAppointment(appt);
      } catch (err: unknown) {
        console.error("[DoctorAppointmentDetails] Error loading appointment:", err);
        if (!ignore) setNotFoundOrUnauthorized(true);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initializeDetails();

    return () => {
      ignore = true;
    };
  }, [profileId, appointmentId]);

  // Handle status update
  const handleUpdateStatus = async (newStatus: "completed" | "no_show") => {
    if (!appointment) return;

    const isUpcoming = isAppointmentUpcoming(appointment);
    if (newStatus === "completed" && isUpcoming) {
      setErrorMessage("Cannot mark a future appointment completed before its scheduled time.");
      return;
    }

    if (newStatus === "no_show" && isUpcoming) {
      setErrorMessage("Cannot mark a future appointment as no-show before its scheduled time.");
      return;
    }

    try {
      setUpdating(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const result = await updateDoctorAppointmentStatus(
        appointment.id,
        newStatus,
        doctor?.id
      );

      if (!result.success) {
        setErrorMessage(result.error || "Failed to update appointment status.");
        return;
      }

      setSuccessMessage(
        `Appointment successfully marked as ${newStatus === "completed" ? "Completed" : "No-Show"}.`
      );

      // Update state locally
      setAppointment((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["doctor"]} redirectPath="/doctor/login">
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Navigation Bar */}
        <DoctorDashboardNav />

        {/* Main Content */}
        <main className="flex-1 py-8 sm:py-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Top Return Breadcrumb */}
            <div className="flex items-center justify-between">
              <Link
                href="/doctor/appointments"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                <span>← Back to Appointments</span>
              </Link>

              <span className="text-xs text-slate-400">
                Timezone: <span className="text-teal-400 font-semibold">Asia/Kolkata</span>
              </span>
            </div>

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-4">
                <div className="h-44 rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse" />
                <div className="h-64 rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse" />
              </div>
            ) : notFoundOrUnauthorized || !appointment ? (
              /* Safe Not Found or Unauthorized Error State */
              <div className="rounded-2xl border border-slate-750 bg-slate-800/80 p-8 sm:p-12 text-center shadow-lg">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Appointment Not Found or Access Denied
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  This appointment record either does not exist or belongs to another medical practice.
                  Doctors are strictly authorized to view only consultations assigned to their own practice.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/doctor/appointments"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                  >
                    <span>Return to My Appointments</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Appointment Details View */
              <div className="space-y-6">
                {/* Feedback Alerts */}
                {successMessage && (
                  <div className="rounded-xl border border-emerald-800 bg-emerald-950/60 p-4 text-sm text-emerald-300 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{successMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSuccessMessage(null)}
                      className="text-emerald-400 hover:text-emerald-200 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-4 text-sm text-rose-300 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <span>{errorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-400 hover:text-rose-200 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Primary Card: Appointment Overview Header */}
                <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-6 sm:p-7 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-700">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-slate-400">
                          APPOINTMENT #{appointment.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            appointment.status === "confirmed"
                              ? "bg-teal-950 text-teal-300 border-teal-800"
                              : appointment.status === "completed"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                              : appointment.status === "cancelled"
                              ? "bg-slate-800 text-slate-400 border-slate-700"
                              : "bg-amber-950 text-amber-300 border-amber-800"
                          }`}
                        >
                          {appointment.status.replace("_", " ")}
                        </span>
                      </div>
                      <h1 className="mt-1.5 text-2xl font-bold text-white">
                        Consultation with {appointment.patient?.full_name || "Patient"}
                      </h1>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Scheduled Slot
                      </span>
                      <span className="block text-sm font-semibold text-teal-300 mt-0.5">
                        {formatAppointmentDateIST(appointment.appointment_date)}
                      </span>
                      <span className="block text-xs text-slate-300">
                        {formatAppointmentTimeIST(appointment.start_time)} - {formatAppointmentTimeIST(appointment.end_time)} (IST)
                      </span>
                    </div>
                  </div>

                  {/* Consultation Specifics */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Reason for Visit
                      </span>
                      <p className="mt-1 text-sm text-slate-200">
                        {appointment.reason ? appointment.reason : "No specific reason provided."}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Patient Consultation Notes
                      </span>
                      <p className="mt-1 text-sm text-slate-200">
                        {appointment.notes ? appointment.notes : "No clinical notes attached."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Authorized Patient Information */}
                <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-6 sm:p-7 shadow-md">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                    <svg className="h-5 w-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <h2 className="text-base font-bold text-white">
                      Authorized Patient Contact Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Patient Full Name
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-white truncate">
                        {appointment.patient?.full_name || "—"}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Phone Contact
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-white truncate">
                        {appointment.patient?.phone || "—"}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Email Address
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-white truncate">
                        {appointment.patient?.email || "—"}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        City / Locality
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-teal-300 truncate">
                        {appointment.patient?.location || "Bhopal"}
                      </span>
                    </div>
                  </div>

                  {/* Privacy Notice Banner */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>
                      Patient contact information is authorized strictly for this medical consultation. MediSphere protects patient data under Row Level Security.
                    </span>
                  </div>
                </div>

                {/* Section 3: Status Transition Controls */}
                <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-6 sm:p-7 shadow-md space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <svg className="h-5 w-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <h2 className="text-base font-bold text-white">
                      Appointment Status & Consultation Outcome
                    </h2>
                  </div>

                  {appointment.status === "confirmed" ? (
                    <div>
                      {isAppointmentUpcoming(appointment) ? (
                        <div className="rounded-xl border border-cyan-800 bg-cyan-950/40 p-4 space-y-3">
                          <div className="flex items-start gap-2.5">
                            <svg className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-semibold text-cyan-200">
                                Future Scheduled Consultation
                              </p>
                              <p className="mt-1 text-xs text-cyan-300/90 leading-relaxed">
                                This consultation is scheduled for {formatAppointmentDateIST(appointment.appointment_date)} at {formatAppointmentTimeIST(appointment.start_time)} IST. Under MediSphere rules, completion or no-show status can only be recorded once the consultation time arrives or passes.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <button
                              type="button"
                              disabled
                              title="Cannot mark a future appointment completed"
                              className="px-4 py-2 rounded-xl bg-slate-700/60 text-slate-400 text-xs font-semibold cursor-not-allowed opacity-60"
                            >
                              Mark Completed (Locked)
                            </button>
                            <button
                              type="button"
                              disabled
                              title="Cannot mark a future appointment as no-show"
                              className="px-4 py-2 rounded-xl bg-slate-700/60 text-slate-400 text-xs font-semibold cursor-not-allowed opacity-60"
                            >
                              Mark No-Show (Locked)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5 space-y-4">
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              Record Consultation Outcome
                            </h3>
                            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                              This consultation&apos;s scheduled time has arrived or passed. You may now record whether the consultation was successfully completed or if the patient did not attend (no-show).
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus("completed")}
                              disabled={updating}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{updating ? "Updating..." : "Mark as Completed"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus("no_show")}
                              disabled={updating}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>{updating ? "Updating..." : "Mark as No-Show"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : appointment.status === "completed" ? (
                    <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
                      <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        This consultation was successfully marked as <strong>Completed</strong>. Outcome recorded in practice records.
                      </span>
                    </div>
                  ) : appointment.status === "no_show" ? (
                    <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-amber-300 text-xs sm:text-sm flex items-center gap-2.5">
                      <svg className="h-5 w-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <span>
                        This consultation was marked as <strong>No-Show</strong> (patient did not attend).
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-400 text-xs sm:text-sm flex items-center gap-2.5">
                      <svg className="h-5 w-5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        This appointment was <strong>Cancelled</strong> and cannot be transitioned to completed or no-show.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
