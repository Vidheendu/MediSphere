"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  getOrCreateDoctorForProfile,
  getDoctorSchedules,
} from "@/lib/services/schedules";
import {
  getCurrentDateIST,
  getDayOfWeekFromDate,
  getDoctorSlotsByDate,
  generateDoctorSlots,
  toggleSlotBlocked,
} from "@/lib/services/slots";
import type { AppointmentSlot, Doctor, DoctorSchedule } from "@/types";

export default function DoctorSlotsPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  // State
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => getCurrentDateIST());
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileId = profile?.id;

  // Refresh slots for selected date
  const refreshSlots = useCallback(async (docId: string, dateStr: string) => {
    try {
      const loadedSlots = await getDoctorSlotsByDate(docId, dateStr);
      setSlots(loadedSlots);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load slots.";
      setErrorMessage(msg);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    if (!profileId) return;

    async function initialize() {
      try {
        const doc = await getOrCreateDoctorForProfile(profileId!);
        if (ignore) return;
        setDoctor(doc);

        if (doc?.id) {
          const loadedSchedules = await getDoctorSchedules(doc.id);
          const loadedSlots = await getDoctorSlotsByDate(doc.id, selectedDate);
          if (!ignore) {
            setSchedules(loadedSchedules);
            setSlots(loadedSlots);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Initialization failed.";
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
  }, [profileId, selectedDate]);

  // Handle date change
  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate);
    setSuccessMessage(null);
    setErrorMessage(null);
    if (doctor?.id) {
      setLoading(true);
      await refreshSlots(doctor.id, newDate);
      setLoading(false);
    }
  };

  // Generate slots for selected date
  const handleGenerateForDate = async () => {
    if (!doctor?.id) return;
    setGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await generateDoctorSlots(
      doctor.id,
      selectedDate,
      selectedDate,
      doctor.id
    );

    setGenerating(false);

    if (result.success) {
      if (result.generatedCount > 0) {
        setSuccessMessage(
          `Successfully generated ${result.generatedCount} slot(s) for ${selectedDate}.`
        );
      } else if (result.skippedExistingCount > 0) {
        setSuccessMessage(
          `All slots for ${selectedDate} already exist (${result.skippedExistingCount} preserved).`
        );
      } else if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage("No slots generated for this date.");
      }
      await refreshSlots(doctor.id, selectedDate);
    } else {
      setErrorMessage(result.error || "Failed to generate slots.");
    }
  };

  // Generate slots for upcoming 7 days
  const handleGenerateNext7Days = async () => {
    if (!doctor?.id) return;
    setGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Calculate end date (selectedDate + 6 days)
    const [y, m, d] = selectedDate.split("-").map(Number);
    const endDateObj = new Date(Date.UTC(y, m - 1, d + 6, 12, 0, 0));
    const endYear = endDateObj.getUTCFullYear();
    const endMonth = String(endDateObj.getUTCMonth() + 1).padStart(2, "0");
    const endDay = String(endDateObj.getUTCDate()).padStart(2, "0");
    const endDateStr = `${endYear}-${endMonth}-${endDay}`;

    const result = await generateDoctorSlots(
      doctor.id,
      selectedDate,
      endDateStr,
      doctor.id
    );

    setGenerating(false);

    if (result.success) {
      setSuccessMessage(
        `Generated ${result.generatedCount} new slot(s) across next 7 days (${result.skippedExistingCount} existing preserved).`
      );
      await refreshSlots(doctor.id, selectedDate);
    } else {
      setErrorMessage(result.error || "Failed to generate weekly slots.");
    }
  };

  // Toggle slot blocked / unblocked
  const handleToggleBlock = async (slot: AppointmentSlot) => {
    if (!doctor?.id) return;
    const isCurrentlyBlocked = slot.status === "blocked";
    const willBlock = !isCurrentlyBlocked;

    setBlockingId(slot.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await toggleSlotBlocked(slot.id, doctor.id, willBlock);
    setBlockingId(null);

    if (result.success) {
      setSuccessMessage(
        `Slot ${slot.start_time.slice(0, 5)} is now ${willBlock ? "blocked" : "available"}.`
      );
      await refreshSlots(doctor.id, selectedDate);
    } else {
      setErrorMessage(result.error || "Failed to toggle slot blocked status.");
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    router.push("/doctor/login");
  };

  // Schedule status for selected date
  const dayOfWeek = getDayOfWeekFromDate(selectedDate);
  const activeDaySchedule = schedules.find(
    (s) => s.day_of_week === dayOfWeek && s.is_active
  );

  const availableCount = slots.filter((s) => s.status === "available").length;
  const blockedCount = slots.filter((s) => s.status === "blocked").length;
  const bookedCount = slots.filter((s) => s.status === "booked").length;

  return (
    <ProtectedRoute allowedRoles={["doctor"]} redirectPath="/doctor/login">
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Top Provider Navbar */}
        <header className="border-b border-slate-800 bg-slate-950/80 shadow-2xs">
          <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-slate-950">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Medi<span className="text-teal-400">Sphere</span>
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/doctor/dashboard"
                className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/doctor/schedule"
                className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Schedule
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 py-8 sm:py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Breadcrumb & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                  <Link
                    href="/doctor/dashboard"
                    className="hover:text-teal-400 transition-colors"
                  >
                    Doctor Portal
                  </Link>
                  <span>/</span>
                  <span className="text-teal-400">Appointment Slots</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Appointment Slot Management
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Generate and inspect date-specific consultation slots for Dr.{" "}
                  {profile?.full_name || "Doctor"}. Indian Standard Time (Asia/Kolkata).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateForDate}
                  disabled={generating || !activeDaySchedule}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  {generating ? "Generating..." : "Generate for Selected Date"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateNext7Days}
                  disabled={generating}
                  className="inline-flex items-center justify-center rounded-lg border border-teal-500/80 bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Generate Next 7 Days
                </button>
              </div>
            </div>

            {/* Date Selector & Day Context Card */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select Calendar Date
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                  <div className="text-xs sm:text-sm">
                    <span className="font-bold text-white">{dayOfWeek}</span>
                    <span className="text-slate-400 ml-2">
                      ({activeDaySchedule ? "Working Shift Configured" : "No Active Shift"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Day Schedule Summary */}
              <div className="text-xs text-slate-300 border-t md:border-t-0 md:border-l border-slate-700/80 pt-3 md:pt-0 md:pl-5">
                {activeDaySchedule ? (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 block">
                      Active Shift Configuration
                    </span>
                    <div className="mt-1 space-y-0.5">
                      <div>
                        🕒 Hours: <strong>{activeDaySchedule.start_time.slice(0, 5)}</strong> –{" "}
                        <strong>{activeDaySchedule.end_time.slice(0, 5)}</strong>
                      </div>
                      {activeDaySchedule.break_start && activeDaySchedule.break_end && (
                        <div className="text-slate-400">
                          ☕ Break: {activeDaySchedule.break_start.slice(0, 5)} –{" "}
                          {activeDaySchedule.break_end.slice(0, 5)}
                        </div>
                      )}
                      <div className="text-teal-300">
                        ⏱️ Slot Duration: {activeDaySchedule.appointment_duration} mins
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
                      No Active Shift for {dayOfWeek}
                    </span>
                    <p className="mt-1 text-slate-400 text-xs">
                      Configure your schedule for {dayOfWeek} to generate appointment slots.
                    </p>
                    <Link
                      href="/doctor/schedule"
                      className="text-xs font-semibold text-teal-400 hover:text-teal-300 inline-block mt-1 underline"
                    >
                      Open Schedule Settings →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            {successMessage && (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/60 p-4 text-emerald-200 text-xs sm:text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{successMessage}</span>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-emerald-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-4 text-rose-200 text-xs sm:text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-rose-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Slot Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-slate-800 border border-slate-700/80 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Total Slots
                </span>
                <span className="mt-1 text-xl font-bold text-white block">
                  {slots.length}
                </span>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700/80 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Available Slots
                </span>
                <span className="mt-1 text-xl font-bold text-emerald-400 block">
                  {availableCount}
                </span>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700/80 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Blocked Slots
                </span>
                <span className="mt-1 text-xl font-bold text-amber-400 block">
                  {blockedCount}
                </span>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700/80 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Booked Slots
                </span>
                <span className="mt-1 text-xl font-bold text-teal-400 block">
                  {bookedCount}
                </span>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-slate-800 border border-slate-700 animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* State: No Schedule Configured for Day */}
            {!loading && !activeDaySchedule && slots.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/60 text-amber-400 mb-3">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">
                  No schedule has been configured for this date.
                </h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  {selectedDate} is a {dayOfWeek}. You do not currently have an active schedule configured for {dayOfWeek}s.
                </p>
                <Link
                  href="/doctor/schedule"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 text-xs font-semibold transition-colors"
                >
                  Configure Schedule for {dayOfWeek} →
                </Link>
              </div>
            )}

            {/* State: Schedule Configured, but No Slots Generated Yet */}
            {!loading && activeDaySchedule && slots.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/60 text-teal-400 mb-3">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">No available slots.</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Your recurring {dayOfWeek} shift ({activeDaySchedule.start_time.slice(0, 5)} –{" "}
                  {activeDaySchedule.end_time.slice(0, 5)}) is active, but slots have not yet been generated for {selectedDate}.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateForDate}
                  disabled={generating}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Slots for this Date"}
                </button>
              </div>
            )}

            {/* Slots Grid */}
            {!loading && slots.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                  <span>
                    Consultation Slots ({slots.length}) • {selectedDate} ({dayOfWeek})
                  </span>
                  <span className="text-teal-400">Strictly Source-Backed Availability</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {slots.map((slot) => {
                    const isAvailable = slot.status === "available";
                    const isBlocked = slot.status === "blocked";
                    const isBooked = slot.status === "booked";

                    return (
                      <div
                        key={slot.id}
                        className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                          isAvailable
                            ? "bg-slate-800 border-slate-700 hover:border-slate-600"
                            : isBlocked
                            ? "bg-slate-800/40 border-amber-900/60"
                            : "bg-teal-950/40 border-teal-800/80"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white font-mono">
                              {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isAvailable
                                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                  : isBlocked
                                  ? "bg-amber-950 text-amber-300 border-amber-800"
                                  : "bg-teal-950 text-teal-300 border-teal-800"
                              }`}
                            >
                              {isAvailable ? "Available" : isBlocked ? "Blocked" : "Booked"}
                            </span>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-400">
                            {isAvailable && "Open for patient appointment discovery"}
                            {isBlocked && "Temporarily blocked from patient view"}
                            {isBooked && "Reserved for patient appointment"}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                          {!isBooked ? (
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(slot)}
                              disabled={blockingId === slot.id}
                              className={`w-full text-xs font-semibold py-1.5 px-3 rounded-lg border transition-colors ${
                                isAvailable
                                  ? "border-amber-800/80 text-amber-300 hover:bg-amber-950/40"
                                  : "border-emerald-800/80 text-emerald-300 hover:bg-emerald-950/40"
                              }`}
                            >
                              {blockingId === slot.id
                                ? "Updating..."
                                : isAvailable
                                ? "Block Slot"
                                : "Unblock Slot"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Active booking
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
