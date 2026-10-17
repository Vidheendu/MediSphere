"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DoctorDashboardNav from "@/components/dashboard/DoctorDashboardNav";
import { getOrCreateDoctorForProfile } from "@/lib/services/schedules";
import {
  getDoctorAppointments,
  getDoctorAppointmentStats,
  getCurrentDateIST,
  formatAppointmentDateIST,
  formatAppointmentTimeIST,
  type DoctorAppointmentStats,
} from "@/lib/services/appointments";
import { getDoctorReviews, getDoctorRatingStats } from "@/lib/services/reviews";
import DoctorReviewsList from "@/components/reviews/DoctorReviewsList";
import type { AppointmentWithDetails, Doctor, PublicDoctorReview, DoctorRatingStats } from "@/types";

export default function DoctorDashboardPage() {
  const { profile } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [reviews, setReviews] = useState<PublicDoctorReview[]>([]);
  const [ratingStats, setRatingStats] = useState<DoctorRatingStats>({
    averageRating: null,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileId = profile?.id;

  const loadDoctorData = useCallback(async (profId: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // 1. Resolve or verify doctor record for authenticated profile
      const doc = await getOrCreateDoctorForProfile(profId);
      setDoctor(doc);

      if (doc?.id) {
        // 2. Fetch real appointments and reviews belonging strictly to this doctor
        const [appts, revs, rStats] = await Promise.all([
          getDoctorAppointments(doc.id),
          getDoctorReviews(doc.id),
          getDoctorRatingStats(doc.id),
        ]);
        setAppointments(appts);
        setReviews(revs);
        setRatingStats(rStats);
      } else {
        setAppointments([]);
        setReviews([]);
        setRatingStats({
          averageRating: null,
          totalReviews: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load doctor dashboard data.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!profileId) return;

    async function initializeDashboard() {
      try {
        const doc = await getOrCreateDoctorForProfile(profileId!);
        if (ignore) return;
        setDoctor(doc);

        if (doc?.id) {
          const [appts, revs, rStats] = await Promise.all([
            getDoctorAppointments(doc.id),
            getDoctorReviews(doc.id),
            getDoctorRatingStats(doc.id),
          ]);
          if (!ignore) {
            setAppointments(appts);
            setReviews(revs);
            setRatingStats(rStats);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load doctor dashboard data.";
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initializeDashboard();

    return () => {
      ignore = true;
    };
  }, [profileId]);


  // Calculate real metrics from database records strictly using Asia/Kolkata
  const stats: DoctorAppointmentStats = getDoctorAppointmentStats(appointments);
  const todayStr = getCurrentDateIST();
  const todayAppointments = appointments.filter((a) => a.appointment_date === todayStr);

  return (
    <ProtectedRoute allowedRoles={["doctor"]} redirectPath="/doctor/login">
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Navigation Bar */}
        <DoctorDashboardNav />

        {/* Dashboard Main Content */}
        <main className="flex-1 py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header Greeting Banner */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-2">
                    <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
                    Verified Practitioner Portal • Asia/Kolkata
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Welcome, Dr. {profile?.full_name || "Doctor"}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
                    Real-time practice dashboard. Manage patient consultations, monitor daily appointments, and adjust your clinic availability.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/doctor/appointments"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2.5 text-sm font-semibold transition-colors shadow-xs"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>View Appointments</span>
                  </Link>

                  <Link
                    href="/doctor/slots"
                    className="inline-flex items-center justify-center rounded-xl border border-teal-500/80 bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 px-3.5 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Manage Slots
                  </Link>

                  <Link
                    href="/doctor/schedule"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-white px-3.5 py-2.5 text-sm font-medium transition-colors"
                  >
                    Schedule
                  </Link>
                </div>
              </div>

              {/* Doctor Details Summary Grid */}
              <div className="mt-6 pt-6 border-t border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Practitioner
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-white truncate">
                    Dr. {profile?.full_name || "Doctor"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Account Email
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-white truncate">
                    {profile?.email || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Phone Contact
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-white truncate">
                    {profile?.phone || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Role & Timezone
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-teal-300 truncate">
                    {doctor?.verification_status ? doctor.verification_status.toUpperCase() : "VERIFIED"} • Asia/Kolkata
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message Feedback */}
            {errorMessage && (
              <div className="rounded-xl border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300 flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => profileId && loadDoctorData(profileId)}
                  className="text-xs underline hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Statistics Counters Grid (Real Data strictly computed in Asia/Kolkata) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Appointment Statistics</span>
                  <span className="text-xs font-normal text-slate-400">
                    (Today: {formatAppointmentDateIST(todayStr)})
                  </span>
                </h2>
                <Link
                  href="/doctor/appointments"
                  className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Manage all →
                </Link>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-28 rounded-xl bg-slate-800/60 border border-slate-700/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Total Appointments */}
                  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-5 shadow-sm hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Total
                      </span>
                      <div className="p-2 rounded-lg bg-slate-700/60 text-slate-300">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="mt-3 block text-3xl font-extrabold text-white">
                      {stats.total}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      All-time recorded
                    </span>
                  </div>

                  {/* Today's Appointments */}
                  <div className="rounded-xl border border-teal-500/50 bg-teal-950/30 p-5 shadow-sm hover:border-teal-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
                        Today
                      </span>
                      <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="mt-3 block text-3xl font-extrabold text-teal-300">
                      {stats.today}
                    </span>
                    <span className="mt-1 block text-[11px] text-teal-400/80">
                      Consultations for today
                    </span>
                  </div>

                  {/* Upcoming Confirmed */}
                  <div className="rounded-xl border border-cyan-800/70 bg-cyan-950/20 p-5 shadow-sm hover:border-cyan-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cyan-300 uppercase tracking-wider">
                        Upcoming
                      </span>
                      <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="mt-3 block text-3xl font-extrabold text-cyan-200">
                      {stats.upcomingConfirmed}
                    </span>
                    <span className="mt-1 block text-[11px] text-cyan-400/80">
                      Future confirmed
                    </span>
                  </div>

                  {/* Completed Appointments */}
                  <div className="rounded-xl border border-emerald-800/70 bg-emerald-950/20 p-5 shadow-sm hover:border-emerald-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">
                        Completed
                      </span>
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="mt-3 block text-3xl font-extrabold text-emerald-200">
                      {stats.completed}
                    </span>
                    <span className="mt-1 block text-[11px] text-emerald-400/80">
                      Finished consultations
                    </span>
                  </div>

                  {/* Cancelled Appointments */}
                  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-5 shadow-sm hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Cancelled
                      </span>
                      <div className="p-2 rounded-lg bg-slate-700/60 text-slate-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="mt-3 block text-3xl font-extrabold text-slate-300">
                      {stats.cancelled}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Patient cancellations
                    </span>
                  </div>

                  {/* Average Rating (Phase 16) */}
                  <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-5 shadow-sm hover:border-amber-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                        Rating
                      </span>
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </div>
                    <span className="mt-3 block text-3xl font-extrabold text-amber-300">
                      {ratingStats.averageRating !== null ? `${ratingStats.averageRating.toFixed(1)} ★` : "—"}
                    </span>
                    <span className="mt-1 block text-[11px] text-amber-400/80">
                      {ratingStats.totalReviews > 0
                        ? `${ratingStats.totalReviews} verified ${ratingStats.totalReviews === 1 ? "review" : "reviews"}`
                        : "No reviews yet"}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Today's Schedule Spotlight */}
            <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-6 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 rounded-full bg-teal-400"></span>
                  <h2 className="text-lg font-bold text-white">
                    Today&apos;s Consultations
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  {formatAppointmentDateIST(todayStr)}
                </span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-400 animate-pulse text-sm">
                  Loading today&apos;s appointments...
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 mb-2.5">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-300">
                    No consultations scheduled for today
                  </p>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                    Any patient bookings for today&apos;s date ({formatAppointmentDateIST(todayStr)}) will appear right here in real time.
                  </p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-750">
                  {todayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="px-2.5 py-1.5 rounded-lg bg-teal-950/80 border border-teal-800 text-teal-300 text-xs font-semibold shrink-0">
                          {formatAppointmentTimeIST(appt.start_time)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {appt.patient?.full_name || "Patient"}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
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
                          </div>
                          {appt.reason && (
                            <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                              Reason: {appt.reason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Link
                          href={`/doctor/appointments/${appt.id}`}
                          className="text-xs font-semibold text-teal-400 hover:text-teal-300 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-750 transition-colors"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Zero Appointments Empty State (When Doctor Has 0 Total Appointments) */}
            {!loading && appointments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 p-8 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">
                  No Appointments Booked Yet
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  You currently have no patient appointments. Ensure your weekly working schedule is configured and generate appointment slots so patients can discover and book consultations with you.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/doctor/schedule"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Configure Working Hours →
                  </Link>
                  <Link
                    href="/doctor/slots"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-medium transition-colors"
                  >
                    Generate Appointment Slots
                  </Link>
                </div>
              </div>
            )}

            {/* Workspace Navigation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Patient Appointments */}
              <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-6 flex flex-col justify-between shadow-md hover:border-slate-600 transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 mb-4">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Patient Appointments
                  </h3>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    View full consultation records, filter by status (upcoming, past, confirmed, completed), inspect patient contact info, and record completion or no-show.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-700">
                  <Link
                    href="/doctor/appointments"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <span>Manage Appointments</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Card 2: Weekly Schedule */}
              <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-6 flex flex-col justify-between shadow-md hover:border-slate-600 transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 mb-4">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Consultation Schedule
                  </h3>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    Set weekly recurring shifts, working hours (start/end), clinic lunch breaks, and appointment duration (15 to 60 mins).
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-700">
                  <Link
                    href="/doctor/schedule"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <span>Open Schedule Manager</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Card 3: Appointment Slots */}
              <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-6 flex flex-col justify-between shadow-md hover:border-slate-600 transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 mb-4">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Slot Management
                  </h3>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    Generate date-specific booking slots from your schedule, inspect available times, and selectively block hours when unavailable.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-700">
                  <Link
                    href="/doctor/slots"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <span>Inspect & Generate Slots</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Doctor Reviews and Ratings Section (Phase 16) */}
            <DoctorReviewsList
              reviews={reviews}
              stats={ratingStats}
              theme="dark"
              title="Patient Reviews & Ratings"
              emptyMessage="No patient reviews yet."
            />
          </div>
        </main>

      </div>
    </ProtectedRoute>
  );
}
