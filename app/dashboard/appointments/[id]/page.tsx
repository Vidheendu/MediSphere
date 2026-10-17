"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PatientDashboardNav from "@/components/dashboard/PatientDashboardNav";
import {
  getAppointmentById,
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  isAppointmentUpcoming,
} from "@/lib/services/appointments";
import { getReviewForAppointment } from "@/lib/services/reviews";
import AppointmentReviewForm from "@/components/reviews/AppointmentReviewForm";
import type { AppointmentWithDetails, AppointmentStatus, DoctorReview } from "@/types";


function formatStatusBadge(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          Confirmed
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="h-2 w-2 rounded-full bg-slate-500"></span>
          Completed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          Cancelled
        </span>
      );
    case "no_show":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          No Show
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
}

export default function AppointmentDetailsPage() {
  const params = useParams();
  const appointmentId = typeof params?.id === "string" ? params.id : "";
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(null);
  const [existingReview, setExistingReview] = useState<DoctorReview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!user || !appointmentId) return;

    async function fetchAppointment() {
      try {
        const [apptData, revData] = await Promise.all([
          getAppointmentById(appointmentId),
          getReviewForAppointment(appointmentId),
        ]);
        if (!ignore) {
          setAppointment(apptData);
          setExistingReview(revData);
          setLoading(false);
        }
      } catch (err) {
        console.error("[AppointmentDetails] Error fetching appointment:", err);
        if (!ignore) {
          setError("Failed to load appointment details.");
          setLoading(false);
        }
      }
    }

    fetchAppointment();

    return () => {
      ignore = true;
    };
  }, [user, appointmentId]);


  return (
    <ProtectedRoute allowedRoles={["patient"]} redirectPath="/login">
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <PatientDashboardNav />

        <main className="flex-1 py-8 sm:py-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/dashboard" className="hover:text-teal-600 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/dashboard/appointments" className="hover:text-teal-600 transition-colors">
                My Appointments
              </Link>
              <span>/</span>
              <span className="text-teal-700 font-semibold truncate max-w-[180px]">
                {appointmentId ? `ID: ${appointmentId.slice(0, 8)}…` : "Details"}
              </span>
            </nav>

            {/* Loading State */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <div className="mx-auto h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-sm text-slate-500">Verifying and loading appointment record...</p>
              </div>
            ) : error || !appointment ? (
              /* Safe Not Found or Unauthorized Message (Never leak another patient's data) */
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Appointment Record Not Found
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    The requested appointment could not be found or you do not have permission to view it. Appointments can only be accessed by the patient who booked them.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/dashboard/appointments"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    Back to My Appointments
                  </Link>
                  <Link
                    href="/doctors"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Find Doctors
                  </Link>
                </div>
              </div>
            ) : (
              /* Appointment Details Content */
              <div className="space-y-6">
                {/* Header Banner Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                          Appointment Reference
                        </span>
                        {isAppointmentUpcoming(appointment) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Upcoming Visit
                          </span>
                        )}
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Consultation Details
                      </h1>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        Reference ID: {appointment.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {formatStatusBadge(appointment.status)}
                    </div>
                  </div>

                  {/* Scheduled Date & Time Spotlight */}
                  <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-teal-600 text-white shrink-0 mt-0.5 shadow-2xs">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-teal-800">
                          Scheduled Consultation (Asia/Kolkata)
                        </span>
                        <p className="text-base sm:text-lg font-bold text-teal-950 mt-0.5">
                          {formatAppointmentDateIST(appointment.appointment_date, {
                            timeZone: "Asia/Kolkata",
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-teal-700 mt-0.5">
                          {formatAppointmentTimeIST(appointment.start_time)} – {formatAppointmentTimeIST(appointment.end_time)} (IST)
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right text-xs text-teal-800 border-t sm:border-t-0 sm:border-l border-teal-200 pt-3 sm:pt-0 sm:pl-4">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-teal-700">
                        Booked On
                      </span>
                      <span className="font-medium text-slate-700">
                        {appointment.created_at
                          ? new Date(appointment.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Confirmed"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Practitioner and Clinic Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Doctor Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h2 className="text-sm font-bold text-slate-900">Practitioner Details</h2>
                      </div>
                      {appointment.doctor?.speciality?.name && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                          {appointment.doctor.speciality.name}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {appointment.doctor?.profile?.full_name?.toLowerCase().startsWith("dr.")
                          ? appointment.doctor?.profile?.full_name
                          : `Dr. ${appointment.doctor?.profile?.full_name || "Verified Practitioner"}`}
                      </h3>
                      {appointment.doctor?.qualification && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {appointment.doctor.qualification}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Experience
                        </span>
                        <span className="font-semibold text-slate-800">
                          {appointment.doctor?.experience_years != null
                            ? `${appointment.doctor.experience_years} years`
                            : "Experienced"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Consultation Fee
                        </span>
                        <span className="font-semibold text-slate-800">
                          {appointment.doctor?.consultation_fee != null
                            ? `₹${appointment.doctor.consultation_fee}`
                            : "Standard"}
                        </span>
                      </div>
                    </div>

                    {appointment.doctor?.about && (
                      <div className="pt-2 border-t border-slate-100 text-xs">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          About Doctor
                        </span>
                        <p className="text-slate-600 line-clamp-3 leading-relaxed">
                          {appointment.doctor.about}
                        </p>
                      </div>
                    )}

                    {appointment.doctor?.id && (
                      <div className="pt-2">
                        <Link
                          href={`/doctors/${appointment.doctor.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                        >
                          <span>View Doctor Profile</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Clinic Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h2 className="text-sm font-bold text-slate-900">Clinic & Location</h2>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {appointment.doctor?.clinic?.city || "Bhopal"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {appointment.doctor?.clinic?.name || "Bhopal Healthcare Center"}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {appointment.doctor?.clinic?.address || "Medical Complex, Bhopal"}
                      </p>
                      {appointment.doctor?.clinic?.pincode && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Pincode: {appointment.doctor.clinic.pincode}
                        </p>
                      )}
                    </div>

                    {appointment.doctor?.clinic?.phone && (
                      <div className="pt-2 border-t border-slate-100 text-xs">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Clinic Contact
                        </span>
                        <span className="font-semibold text-slate-800">
                          {appointment.doctor.clinic.phone}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Location Note
                      </span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Please arrive 10–15 minutes prior to your scheduled consultation time. Bring any previous prescriptions or relevant reports.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visit Reason & Notes Card */}
                {(appointment.reason || appointment.notes) && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                      Patient Consultation Notes
                    </h2>

                    {appointment.reason && (
                      <div className="text-xs">
                        <span className="font-bold text-slate-500">Reason for visit: </span>
                        <p className="text-slate-800 mt-0.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                          {appointment.reason}
                        </p>
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="text-xs">
                        <span className="font-bold text-slate-500">Additional notes: </span>
                        <p className="text-slate-800 mt-0.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                          {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Doctor Review and Rating Section (Phase 16) */}
                <AppointmentReviewForm
                  appointment={appointment}
                  initialReview={existingReview}
                  onReviewSubmitted={(newReview) => setExistingReview(newReview)}
                />

                {/* Bottom Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">

                  <Link
                    href="/dashboard/appointments"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>← Back to My Appointments</span>
                  </Link>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Print Summary</span>
                    </button>

                    <Link
                      href="/doctors"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
                    >
                      <span>Book Another Appointment</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
