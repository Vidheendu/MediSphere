"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PatientDashboardNav from "@/components/dashboard/PatientDashboardNav";
import {
  getPatientAppointments,
  getAppointmentCounts,
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  isAppointmentUpcoming,
  type AppointmentCounts,
} from "@/lib/services/appointments";
import type { AppointmentWithDetails } from "@/types";

export default function PatientDashboardPage() {
  const { profile, user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!user) return;

    async function fetchData() {
      try {
        const data = await getPatientAppointments();
        if (!ignore) {
          setAppointments(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("[PatientDashboard] Error loading appointments:", err);
        if (!ignore) {
          setError("Failed to load your dashboard records. Please try again.");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
    };
  }, [user]);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientAppointments();
      setAppointments(data);
    } catch (err: unknown) {
      console.error("[PatientDashboard] Error reloading appointments:", err);
      setError("Failed to load your dashboard records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Aggregate metrics derived strictly from actual database records
  const counts: AppointmentCounts = getAppointmentCounts(appointments);

  // Find next upcoming appointment
  const upcomingAppointments = appointments
    .filter((a) => isAppointmentUpcoming(a))
    .sort((a, b) => {
      const aTime = new Date(`${a.appointment_date}T${a.start_time.slice(0, 5)}:00+05:30`).getTime();
      const bTime = new Date(`${b.appointment_date}T${b.start_time.slice(0, 5)}:00+05:30`).getTime();
      return aTime - bTime;
    });
  const nextAppointment = upcomingAppointments[0] || null;

  const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name || "Patient";

  return (
    <ProtectedRoute allowedRoles={["patient"]} redirectPath="/login">
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <PatientDashboardNav />

        <main className="flex-1 py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Welcome Banner Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Verified Patient Account
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome back, {displayName}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage your medical appointments, explore verified healthcare specialists, and update your personal details.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/doctors"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Find Doctors</span>
                  </Link>

                  <Link
                    href="/dashboard/appointments"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Appointment History</span>
                  </Link>

                  <Link
                    href="/dashboard/profile"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile Settings</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Metric Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Appointments */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total Appointments
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {loading ? "…" : counts.total}
                  </span>
                  <span className="text-xs font-medium text-slate-400">records</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                  <Link
                    href="/dashboard/appointments"
                    className="font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    <span>View all appointments</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Upcoming Active
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-700">
                    {loading ? "…" : counts.upcoming}
                  </span>
                  <span className="text-xs font-medium text-slate-400">in IST</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                  <Link
                    href="/dashboard/appointments?filter=upcoming"
                    className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>View upcoming schedule</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Completed Appointments */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Completed
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {loading ? "…" : counts.completed}
                  </span>
                  <span className="text-xs font-medium text-slate-400">completed</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                  <Link
                    href="/dashboard/appointments?filter=completed"
                    className="font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <span>View visit history</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Cancelled Appointments */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Cancelled
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-rose-700">
                    {loading ? "…" : counts.cancelled}
                  </span>
                  <span className="text-xs font-medium text-slate-400">cancelled</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                  <Link
                    href="/dashboard/appointments?filter=cancelled"
                    className="font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1"
                  >
                    <span>View cancelled list</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Next Upcoming Appointment Section OR Empty State */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center">
                <div className="mx-auto h-7 w-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-xs text-slate-500 font-medium">Loading your appointment details...</p>
              </div>
            ) : nextAppointment ? (
              <div className="bg-gradient-to-br from-teal-50/80 via-white to-white rounded-2xl border border-teal-200 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-teal-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Next Upcoming Consultation
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                    Confirmed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Doctor
                    </span>
                    <span className="mt-1 block font-bold text-slate-900 text-sm sm:text-base">
                      {nextAppointment.doctor?.profile?.full_name?.toLowerCase().startsWith("dr.")
                        ? nextAppointment.doctor?.profile?.full_name
                        : `Dr. ${nextAppointment.doctor?.profile?.full_name || "Verified Practitioner"}`}
                    </span>
                    <span className="text-xs text-slate-500">
                      {nextAppointment.doctor?.speciality?.name || "Specialist"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Date (Asia/Kolkata)
                    </span>
                    <span className="mt-1 block font-bold text-slate-900">
                      {formatAppointmentDateIST(nextAppointment.appointment_date)}
                    </span>
                    <span className="text-xs font-semibold text-teal-700">
                      {formatAppointmentTimeIST(nextAppointment.start_time)} – {formatAppointmentTimeIST(nextAppointment.end_time)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Clinic
                    </span>
                    <span className="mt-1 block font-medium text-slate-900">
                      {nextAppointment.doctor?.clinic?.name || "Bhopal Healthcare"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {nextAppointment.doctor?.clinic?.city || "Bhopal, MP"}
                    </span>
                  </div>

                  <div className="flex sm:justify-end items-center">
                    <Link
                      href={`/dashboard/appointments/${nextAppointment.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors w-full sm:w-auto"
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    No Appointments Booked Yet
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    You have not booked any consultations yet. Explore verified doctors in Bhopal across Dermatology, Cardiology, ENT, Dentistry, and more.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/doctors"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    <span>Find Doctors & Book Now</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  No upcoming appointments scheduled right now.
                </p>
                <p className="text-xs text-slate-500">
                  You have {appointments.length} historical records in your appointment history.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href="/doctors"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    <span>Find doctors to book a new appointment</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Profile Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Patient Profile Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your personal information stored securely in the database.
                  </p>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit Profile</span>
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Full Name
                  </span>
                  <span className="mt-1 block font-bold text-slate-900 truncate">
                    {profile?.full_name || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </span>
                  <span className="mt-1 block font-bold text-slate-900 truncate">
                    {profile?.email || user?.email || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Phone
                  </span>
                  <span className="mt-1 block font-bold text-slate-900 truncate">
                    {profile?.phone || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </span>
                  <span className="mt-1 block font-bold text-slate-900 truncate">
                    {profile?.location || "Bhopal, MP"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
