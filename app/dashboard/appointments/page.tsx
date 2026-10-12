"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PatientDashboardNav from "@/components/dashboard/PatientDashboardNav";
import {
  getPatientAppointments,
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  isAppointmentUpcoming,
  isAppointmentPast,
  getAppointmentCounts,
} from "@/lib/services/appointments";
import type { AppointmentWithDetails, AppointmentStatus } from "@/types";

type FilterTab =
  | "all"
  | "upcoming"
  | "past"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

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

function AppointmentsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Initialize filter from URL query param if present
  const initialFilter = (searchParams.get("filter") as FilterTab) || "all";
  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    ["all", "upcoming", "past", "confirmed", "completed", "cancelled", "no_show"].includes(initialFilter)
      ? initialFilter
      : "all"
  );

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
      } catch (err) {
        console.error("[PatientAppointments] Failed to load appointments:", err);
        if (!ignore) {
          setError("Failed to load your appointments. Please try again.");
          setAppointments([]);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
    };
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await getPatientAppointments();
      setAppointments(data);
    } catch (err) {
      console.error("[PatientAppointments] Failed to refresh appointments:", err);
      setError("Failed to load your appointments. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const counts = useMemo(() => getAppointmentCounts(appointments), [appointments]);

  // Filter appointments according to selected tab and optional search query
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // 1. Tab filter
      let matchesTab = true;
      if (activeFilter === "upcoming") {
        matchesTab = isAppointmentUpcoming(appt);
      } else if (activeFilter === "past") {
        matchesTab = isAppointmentPast(appt);
      } else if (activeFilter === "confirmed") {
        matchesTab = appt.status === "confirmed";
      } else if (activeFilter === "completed") {
        matchesTab = appt.status === "completed";
      } else if (activeFilter === "cancelled") {
        matchesTab = appt.status === "cancelled";
      } else if (activeFilter === "no_show") {
        matchesTab = appt.status === "no_show";
      }

      if (!matchesTab) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const docName = (appt.doctor?.profile?.full_name || "").toLowerCase();
        const specName = (appt.doctor?.speciality?.name || "").toLowerCase();
        const clinicName = (appt.doctor?.clinic?.name || "").toLowerCase();
        const apptId = (appt.id || "").toLowerCase();
        return (
          docName.includes(query) ||
          specName.includes(query) ||
          clinicName.includes(query) ||
          apptId.includes(query)
        );
      }

      return true;
    });
  }, [appointments, activeFilter, searchQuery]);

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.total },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming },
    { id: "past", label: "Past", count: counts.past },
    { id: "confirmed", label: "Confirmed", count: counts.confirmed },
    { id: "completed", label: "Completed", count: counts.completed },
    { id: "cancelled", label: "Cancelled", count: counts.cancelled },
    { id: "no_show", label: "No Show", count: counts.no_show },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/dashboard" className="hover:text-teal-600 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-teal-700 font-semibold">My Appointments</span>
      </nav>

      {/* Header Title Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Patient Visit History
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Appointments
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Review and manage your scheduled consultations, clinic details, and visit history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <Link
              href="/doctors"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Book Appointment</span>
            </Link>
          </div>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Scrollable Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {filterTabs.map((tab) => {
              const isSelected = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? "bg-teal-700 text-teal-100"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Filter by doctor, speciality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
            />
            <svg
              className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5"
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
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="mx-auto h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Loading your appointment history...</p>
        </div>
      ) : appointments.length === 0 ? (
        /* Overall Empty State (User has 0 appointments in DB) */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
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
      ) : filteredAppointments.length === 0 ? (
        /* Filter Empty State (Appointments exist, but 0 match active filter or search) */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-3 shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No matching appointments found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `No appointments match "${searchQuery}" under the "${activeFilter}" filter.`
              : `There are currently no appointments matching the "${activeFilter}" filter.`}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
            >
              View All Appointments ({appointments.length})
            </button>
          </div>
        </div>
      ) : (
        /* Appointment Cards List */
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {
            const rawDoctorName = appt.doctor?.profile?.full_name?.trim();
            const docDisplayName = rawDoctorName
              ? rawDoctorName.toLowerCase().startsWith("dr.")
                ? rawDoctorName
                : `Dr. ${rawDoctorName}`
              : "Verified Practitioner";

            const specialityName = appt.doctor?.speciality?.name || "Medical Consultation";
            const clinicName = appt.doctor?.clinic?.name || "Bhopal Healthcare Center";
            const clinicCity = appt.doctor?.clinic?.city || "Bhopal";
            const isUpcoming = isAppointmentUpcoming(appt);

            return (
              <div
                key={appt.id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4 ${
                  isUpcoming ? "border-teal-200/90" : "border-slate-200/90"
                }`}
              >
                {/* Top Row: ID, Badges, and Details Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">ID:</span>
                    <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      {appt.id}
                    </span>
                    {isUpcoming && (
                      <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {formatStatusBadge(appt.status)}
                    <Link
                      href={`/dashboard/appointments/${appt.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                  {/* Doctor Info */}
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

                  {/* Speciality Info */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Speciality
                    </span>
                    <span className="mt-1 inline-block font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 text-xs">
                      {specialityName}
                    </span>
                  </div>

                  {/* Clinic Info */}
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

                  {/* Date & Time (Asia/Kolkata) */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Scheduled Time (IST)
                    </span>
                    <span className="mt-1 block font-bold text-slate-900">
                      {formatAppointmentDateIST(appt.appointment_date)}
                    </span>
                    <span className="block text-xs text-slate-600 font-medium">
                      {formatAppointmentTimeIST(appt.start_time)} – {formatAppointmentTimeIST(appt.end_time)}
                    </span>
                  </div>
                </div>

                {/* Reason for visit, if present */}
                {appt.reason && (
                  <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between gap-4">
                    <div>
                      <span className="font-semibold text-slate-500">Reason: </span>
                      <span className="text-slate-800">{appt.reason}</span>
                    </div>
                    <Link
                      href={`/dashboard/appointments/${appt.id}`}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700 sm:hidden"
                    >
                      Details →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <ProtectedRoute allowedRoles={["patient"]} redirectPath="/login">
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <PatientDashboardNav />

        <main className="flex-1 py-8 sm:py-10">
          <Suspense
            fallback={
              <div className="mx-auto max-w-7xl px-4 py-12 text-center">
                <div className="mx-auto h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-xs text-slate-500">Loading appointments...</p>
              </div>
            }
          >
            <AppointmentsContent />
          </Suspense>
        </main>
      </div>
    </ProtectedRoute>
  );
}
