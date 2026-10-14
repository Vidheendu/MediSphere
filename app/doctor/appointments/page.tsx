"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DoctorDashboardNav from "@/components/dashboard/DoctorDashboardNav";
import { getOrCreateDoctorForProfile } from "@/lib/services/schedules";
import {
  getDoctorAppointments,
  filterDoctorAppointments,
  updateDoctorAppointmentStatus,
  getCurrentDateIST,
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  isAppointmentUpcoming,
  type DoctorAppointmentFilter,
} from "@/lib/services/appointments";
import type { AppointmentWithDetails, Doctor } from "@/types";

export default function DoctorAppointmentsPage() {
  const { profile } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DoctorAppointmentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileId = profile?.id;
  const todayStr = getCurrentDateIST();

  useEffect(() => {
    let ignore = false;
    if (!profileId) return;

    async function initialize() {
      try {
        const doc = await getOrCreateDoctorForProfile(profileId!);
        if (ignore) return;
        setDoctor(doc);

        if (doc?.id) {
          const appts = await getDoctorAppointments(doc.id);
          if (!ignore) {
            setAppointments(appts);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load patient appointments.";
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      ignore = true;
    };
  }, [profileId]);

  // Handle status update (Completed or No-show)
  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: "completed" | "no_show",
    isUpcoming: boolean
  ) => {
    if (newStatus === "completed" && isUpcoming) {
      setErrorMessage("Cannot mark a future appointment completed before its scheduled time.");
      return;
    }

    if (newStatus === "no_show" && isUpcoming) {
      setErrorMessage("Cannot mark a future appointment as no-show before its scheduled time.");
      return;
    }

    try {
      setUpdatingId(appointmentId);
      setSuccessMessage(null);
      setErrorMessage(null);

      const result = await updateDoctorAppointmentStatus(
        appointmentId,
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
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId ? { ...a, status: newStatus } : a
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  // 1. Filter by category
  const filteredByCategory = useMemo(() => {
    return filterDoctorAppointments(appointments, activeFilter);
  }, [appointments, activeFilter]);

  // 2. Filter by search query (patient name, phone, email, reason, or appointment ID)
  const finalAppointments = useMemo(() => {
    if (!searchQuery.trim()) return filteredByCategory;
    const query = searchQuery.toLowerCase().trim();

    return filteredByCategory.filter((appt) => {
      const patientName = appt.patient?.full_name?.toLowerCase() || "";
      const patientPhone = appt.patient?.phone?.toLowerCase() || "";
      const patientEmail = appt.patient?.email?.toLowerCase() || "";
      const reason = appt.reason?.toLowerCase() || "";
      const apptId = appt.id.toLowerCase();

      return (
        patientName.includes(query) ||
        patientPhone.includes(query) ||
        patientEmail.includes(query) ||
        reason.includes(query) ||
        apptId.includes(query)
      );
    });
  }, [filteredByCategory, searchQuery]);

  // Tab definitions
  const filterTabs: { label: string; value: DoctorAppointmentFilter; count?: number }[] = [
    { label: "All", value: "all", count: appointments.length },
    {
      label: "Today",
      value: "today",
      count: appointments.filter((a) => a.appointment_date === todayStr).length,
    },
    {
      label: "Upcoming",
      value: "upcoming",
      count: appointments.filter((a) => isAppointmentUpcoming(a)).length,
    },
    {
      label: "Past",
      value: "past",
      count: appointments.filter((a) => a.status === "completed" || a.status === "no_show" || (a.status === "confirmed" && !isAppointmentUpcoming(a))).length,
    },
    {
      label: "Confirmed",
      value: "confirmed",
      count: appointments.filter((a) => a.status === "confirmed").length,
    },
    {
      label: "Completed",
      value: "completed",
      count: appointments.filter((a) => a.status === "completed").length,
    },
    {
      label: "Cancelled",
      value: "cancelled",
      count: appointments.filter((a) => a.status === "cancelled").length,
    },
    {
      label: "No-Show",
      value: "no_show",
      count: appointments.filter((a) => a.status === "no_show").length,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["doctor"]} redirectPath="/doctor/login">
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Navigation Bar */}
        <DoctorDashboardNav />

        {/* Appointments Main Content */}
        <main className="flex-1 py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                  Consultation Management
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Patient Appointments
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Manage appointments booked with your practice. View patient contact details and update consultation statuses.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/doctor/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 text-xs sm:text-sm font-medium transition-colors"
                >
                  <span>← Dashboard</span>
                </Link>
                <Link
                  href="/doctor/slots"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Manage Slots
                </Link>
              </div>
            </div>

            {/* Notifications / Alerts */}
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
                  className="text-emerald-400 hover:text-emerald-200 text-xs ml-4"
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
                  className="text-rose-400 hover:text-rose-200 text-xs ml-4"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Filters and Search Bar Card */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-sm space-y-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveFilter(tab.value)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeFilter === tab.value
                        ? "bg-teal-500 text-slate-950 shadow-xs"
                        : "bg-slate-900/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-750"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === "number" && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          activeFilter === tab.value
                            ? "bg-teal-950 text-teal-200"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by patient name, phone, email, reason, or appointment ID..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <svg
                  className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Appointments List / Grid */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse"
                  />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              /* Doctor has 0 appointments overall */
              <div className="rounded-2xl border border-dashed border-slate-750 bg-slate-800/40 p-12 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-700/50 flex items-center justify-center text-slate-400 mb-3.5">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">No Appointments Yet</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  You currently have no patient appointments. Ensure your weekly schedule is active and slots are generated so patients can book visits.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Link
                    href="/doctor/slots"
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Generate Slots
                  </Link>
                  <Link
                    href="/doctor/schedule"
                    className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-medium transition-colors"
                  >
                    Manage Schedule
                  </Link>
                </div>
              </div>
            ) : finalAppointments.length === 0 ? (
              /* No appointments matching filter/search */
              <div className="rounded-2xl border border-slate-750 bg-slate-800/50 p-10 text-center">
                <p className="text-sm font-semibold text-slate-300">
                  No appointments match the selected filter or search
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Try switching to &quot;All&quot; or clearing your search query.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {finalAppointments.map((appt) => {
                  const isUpcoming = isAppointmentUpcoming(appt);
                  const isToday = appt.appointment_date === todayStr;
                  const isUpdating = updatingId === appt.id;

                  return (
                    <div
                      key={appt.id}
                      className="rounded-2xl border border-slate-750 bg-slate-800/80 p-5 sm:p-6 shadow-md hover:border-slate-650 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Left: Patient and Appointment Info */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-white">
                              {appt.patient?.full_name || "Patient"}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                appt.status === "confirmed"
                                  ? "bg-teal-950 text-teal-300 border-teal-800"
                                  : appt.status === "completed"
                                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                  : appt.status === "cancelled"
                                  ? "bg-slate-800 text-slate-400 border-slate-700"
                                  : "bg-amber-950 text-amber-300 border-amber-800"
                              }`}
                            >
                              {appt.status.replace("_", " ")}
                            </span>

                            {/* Today Badge */}
                            {isToday && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500 text-slate-950">
                                TODAY
                              </span>
                            )}

                            {/* Upcoming Tag */}
                            {isUpcoming && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                                Upcoming
                              </span>
                            )}
                          </div>

                          {/* Date & Time */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <svg className="h-4 w-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatAppointmentDateIST(appt.appointment_date)}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <svg className="h-4 w-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {formatAppointmentTimeIST(appt.start_time)} - {formatAppointmentTimeIST(appt.end_time)} (IST)
                              </span>
                            </div>

                            <span className="text-slate-400 font-mono text-[11px]">
                              ID: #{appt.id.slice(0, 8)}
                            </span>
                          </div>

                          {/* Patient Contact Details Authorized for Appointment */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
                            {appt.patient?.phone && (
                              <div className="flex items-center gap-1 text-slate-300">
                                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>{appt.patient.phone}</span>
                              </div>
                            )}

                            {appt.patient?.email && (
                              <div className="flex items-center gap-1 text-slate-300">
                                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>{appt.patient.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Reason for Visit */}
                          {appt.reason && (
                            <div className="text-xs text-slate-300 pt-1">
                              <span className="font-semibold text-slate-400">Reason: </span>
                              <span>{appt.reason}</span>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t border-slate-750 lg:border-t-0">
                          {/* Status Transitions: Only when status is confirmed */}
                          {appt.status === "confirmed" && (
                            <>
                              {isUpcoming ? (
                                <div className="text-[11px] text-slate-400 italic px-2 py-1 bg-slate-900/60 rounded-lg border border-slate-800">
                                  Future consultation
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(appt.id, "completed", isUpcoming)}
                                    disabled={isUpdating}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                  >
                                    {isUpdating ? "Updating..." : "Mark Completed"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(appt.id, "no_show", isUpcoming)}
                                    disabled={isUpdating}
                                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                  >
                                    {isUpdating ? "Updating..." : "Mark No-Show"}
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          <Link
                            href={`/doctor/appointments/${appt.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors"
                          >
                            <span>Details</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </div>
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
