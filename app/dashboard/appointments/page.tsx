"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { getPatientAppointments } from "@/lib/services/appointments";
import type { AppointmentWithDetails, AppointmentStatus } from "@/types";

function formatTime12h(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.slice(0, 2) : "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatStatusBadge(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Confirmed
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
          Completed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
          Cancelled
        </span>
      );
    case "no_show":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          No Show
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
}

export default function PatientAppointmentsPage() {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    if (!user) return;

    async function loadAppointments() {
      try {
        const data = await getPatientAppointments();
        if (!ignore) {
          setAppointments(data);
        }
      } catch (err) {
        console.error("Failed to load appointments:", err);
        if (!ignore) {
          setAppointments([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAppointments();

    return () => {
      ignore = true;
    };
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getPatientAppointments();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to refresh appointments:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <ProtectedRoute allowedRoles={["patient"]} redirectPath="/login">
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Top Header */}
        <header className="border-b border-slate-200 bg-white shadow-2xs">
          <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Medi<span className="text-teal-600">Sphere</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-teal-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/dashboard" className="hover:text-teal-600 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-teal-700 font-semibold">My Appointments</span>
            </nav>

            {/* Header Title Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Patient Appointment History
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    My Appointments
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    View confirmed appointments and visit history for your account.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <svg
                      className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Refresh</span>
                  </button>

                  <Link
                    href="/doctors"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    <span>Book Appointment</span>
                    <span>+</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Appointments Content Area */}
            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <div className="mx-auto h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-sm text-slate-500">Loading your appointment history...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    No Appointments Booked Yet
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    When you schedule a consultation with a verified doctor in Bhopal, your confirmed details will appear here.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/doctors"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    <span>Find Doctors & Book</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => {
                  const doctorProfileName = appt.doctor?.profile?.full_name?.trim();
                  const docDisplayName = doctorProfileName
                    ? doctorProfileName.toLowerCase().startsWith("dr.")
                      ? doctorProfileName
                      : `Dr. ${doctorProfileName}`
                    : "Verified Practitioner";

                  const specialityName = appt.doctor?.speciality?.name || "Medical Consultation";
                  const clinicName = appt.doctor?.clinic?.name || "Bhopal Healthcare Center";
                  const clinicCity = appt.doctor?.clinic?.city || "Bhopal";

                  return (
                    <div
                      key={appt.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs hover:border-slate-300 transition-colors space-y-4"
                    >
                      {/* Top Bar: ID and Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">ID:</span>
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            {appt.id}
                          </span>
                        </div>
                        <div>{formatStatusBadge(appt.status)}</div>
                      </div>

                      {/* Main Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                        {/* Doctor */}
                        <div>
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Doctor
                          </span>
                          <span className="mt-1 block font-bold text-slate-900 text-sm sm:text-base">
                            {docDisplayName}
                          </span>
                          {appt.doctor?.qualification && (
                            <span className="block text-xs text-slate-500">
                              {appt.doctor.qualification}
                            </span>
                          )}
                        </div>

                        {/* Speciality */}
                        <div>
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Speciality
                          </span>
                          <span className="mt-1 inline-block font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 text-xs">
                            {specialityName}
                          </span>
                        </div>

                        {/* Clinic */}
                        <div>
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Clinic
                          </span>
                          <span className="mt-1 block font-medium text-slate-800">
                            {clinicName}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {clinicCity}
                          </span>
                        </div>

                        {/* Date & Time */}
                        <div>
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Scheduled Time
                          </span>
                          <span className="mt-1 block font-bold text-slate-900">
                            {new Date(`${appt.appointment_date}T12:00:00Z`).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </span>
                          <span className="block text-xs text-slate-600 font-medium">
                            {formatTime12h(appt.start_time)} – {formatTime12h(appt.end_time)}
                          </span>
                        </div>
                      </div>

                      {/* Optional Reason */}
                      {appt.reason && (
                        <div className="pt-2 border-t border-slate-100 text-xs">
                          <span className="font-semibold text-slate-500">Reason for visit: </span>
                          <span className="text-slate-800">{appt.reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
