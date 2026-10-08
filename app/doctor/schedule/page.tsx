"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  DAYS_OF_WEEK,
  getOrCreateDoctorForProfile,
  getDoctorSchedules,
  upsertDoctorSchedule,
  deleteDoctorSchedule,
  toggleDoctorScheduleActive,
  validateScheduleInput,
  type ScheduleInput,
} from "@/lib/services/schedules";
import type { DayOfWeek, Doctor, DoctorSchedule } from "@/types";

export default function DoctorSchedulePage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  // State
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form / Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);
  const [formDay, setFormDay] = useState<DayOfWeek>("Monday");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formHasBreak, setFormHasBreak] = useState(false);
  const [formBreakStart, setFormBreakStart] = useState("13:00");
  const [formBreakEnd, setFormBreakEnd] = useState("14:00");
  const [formDuration, setFormDuration] = useState(30);
  const [formIsActive, setFormIsActive] = useState(true);

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formValidationErrors, setFormValidationErrors] = useState<string[]>([]);

  const profileId = profile?.id;

  // Refresh schedules without cascading effect renders
  const refreshSchedules = useCallback(async (docId: string) => {
    try {
      const loadedSchedules = await getDoctorSchedules(docId);
      setSchedules(loadedSchedules);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh schedules.";
      setErrorMessage(msg);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    if (!profileId) return;

    async function initializeSchedule() {
      try {
        const doc = await getOrCreateDoctorForProfile(profileId!);
        if (ignore) return;
        setDoctor(doc);

        if (doc?.id) {
          const loadedSchedules = await getDoctorSchedules(doc.id);
          if (!ignore) {
            setSchedules(loadedSchedules);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load schedule data.";
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initializeSchedule();

    return () => {
      ignore = true;
    };
  }, [profileId]);

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    router.push("/doctor/login");
  };

  // Open form for a new day or specific day
  const handleOpenAddForm = (initialDay?: DayOfWeek) => {
    // Pick the first unconfigured day if none provided
    const unconfigured = DAYS_OF_WEEK.find(
      (day) => !schedules.some((s) => s.day_of_week === day)
    );
    const targetDay = initialDay || unconfigured || "Monday";

    setEditingSchedule(null);
    setFormDay(targetDay);
    setFormStartTime("09:00");
    setFormEndTime("17:00");
    setFormHasBreak(false);
    setFormBreakStart("13:00");
    setFormBreakEnd("14:00");
    setFormDuration(30);
    setFormIsActive(true);
    setFormValidationErrors([]);
    setSuccessMessage(null);
    setIsFormOpen(true);
  };

  // Open form to edit an existing day
  const handleOpenEditForm = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setFormDay(schedule.day_of_week);
    setFormStartTime(schedule.start_time.slice(0, 5));
    setFormEndTime(schedule.end_time.slice(0, 5));

    const hasBreak = Boolean(schedule.break_start && schedule.break_end);
    setFormHasBreak(hasBreak);
    setFormBreakStart(schedule.break_start ? schedule.break_start.slice(0, 5) : "13:00");
    setFormBreakEnd(schedule.break_end ? schedule.break_end.slice(0, 5) : "14:00");
    setFormDuration(schedule.appointment_duration);
    setFormIsActive(schedule.is_active);
    setFormValidationErrors([]);
    setSuccessMessage(null);
    setIsFormOpen(true);
  };

  // Handle form submit
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor?.id) {
      setErrorMessage("Doctor account identifier not found.");
      return;
    }

    const payload: ScheduleInput = {
      id: editingSchedule?.id,
      doctor_id: doctor.id,
      day_of_week: formDay,
      start_time: formStartTime,
      end_time: formEndTime,
      break_start: formHasBreak ? formBreakStart : null,
      break_end: formHasBreak ? formBreakEnd : null,
      appointment_duration: Number(formDuration),
      is_active: formIsActive,
    };

    // Client-side validation
    const validation = validateScheduleInput(payload);
    if (!validation.valid) {
      setFormValidationErrors(validation.errors);
      return;
    }

    setSaving(true);
    setFormValidationErrors([]);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await upsertDoctorSchedule(payload, doctor.id);
    setSaving(false);

    if (result.success) {
      setSuccessMessage(`Schedule for ${formDay} saved successfully.`);
      setIsFormOpen(false);
      if (doctor?.id) await refreshSchedules(doctor.id);
    } else {
      setErrorMessage(result.error || "Failed to save schedule.");
    }
  };

  // Handle toggle active/inactive
  const handleToggleActive = async (schedule: DoctorSchedule) => {
    if (!doctor?.id) return;
    setTogglingId(schedule.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const newStatus = !schedule.is_active;
    const result = await toggleDoctorScheduleActive(schedule.id, newStatus, doctor.id);
    setTogglingId(null);

    if (result.success) {
      setSuccessMessage(
        `${schedule.day_of_week} schedule is now ${newStatus ? "active" : "disabled"}.`
      );
      if (doctor?.id) await refreshSchedules(doctor.id);
    } else {
      setErrorMessage(result.error || "Failed to toggle schedule state.");
    }
  };

  // Handle delete
  const handleDeleteSchedule = async (schedule: DoctorSchedule) => {
    if (!doctor?.id) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove your schedule for ${schedule.day_of_week}?`
    );
    if (!confirmed) return;

    setDeletingId(schedule.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await deleteDoctorSchedule(schedule.id, doctor.id);
    setDeletingId(null);

    if (result.success) {
      setSuccessMessage(`Schedule for ${schedule.day_of_week} removed.`);
      if (doctor?.id) await refreshSchedules(doctor.id);
    } else {
      setErrorMessage(result.error || "Failed to delete schedule.");
    }
  };

  // Quick stats
  const activeCount = schedules.filter((s) => s.is_active).length;
  const configuredDaysCount = schedules.length;

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

            <div className="flex items-center gap-3">
              <Link
                href="/doctor/dashboard"
                className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
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
                  <span className="text-teal-400">Availability & Schedule</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Weekly Consultation Schedule
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Configure recurring working hours, lunch breaks, and appointment durations for Dr.{" "}
                  {profile?.full_name || "Doctor"}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenAddForm()}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
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
                  Configure Working Day
                </button>
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

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-800 border border-slate-700/80 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Configured Days
                </span>
                <span className="mt-1 text-2xl font-bold text-white block">
                  {configuredDaysCount} / 7
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Days with defined working hours
                </span>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700/80 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Active Consultation Days
                </span>
                <span className="mt-1 text-2xl font-bold text-teal-400 block">
                  {activeCount}
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Days currently open for booking
                </span>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700/80 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Schedule Policy
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-200 block">
                  Authentic Provider Driven
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Zero simulated slots. Only active days displayed.
                </span>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-slate-800 border border-slate-700 animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Empty Schedule State */}
            {!loading && schedules.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-10 sm:p-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-700/60 text-teal-400 mb-4">
                  <svg
                    className="h-7 w-7"
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
                <h3 className="text-lg font-bold text-white">
                  No schedule has been configured yet.
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  Set up your recurring working hours and consultation slot durations so patients can discover your availability. Days without configured schedules will show as unavailable.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddForm()}
                  className="mt-6 inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-2.5 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Configure Your First Working Day
                </button>
              </div>
            )}

            {/* Weekly Schedule Days List */}
            {!loading && schedules.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                  <span>Weekly Availability ({schedules.length} days configured)</span>
                  <span className="text-teal-400">Strictly Patient-Visible When Active</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {DAYS_OF_WEEK.map((day) => {
                    const schedule = schedules.find((s) => s.day_of_week === day);

                    if (!schedule) {
                      return (
                        <div
                          key={day}
                          className="rounded-xl border border-slate-800/60 bg-slate-800/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-slate-400 hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                            <div>
                              <span className="text-base font-bold text-slate-300">{day}</span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Not configured • Unavailable (Day Off)
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenAddForm(day)}
                            className="self-start sm:self-auto text-xs font-semibold text-teal-400 hover:text-teal-300 px-3 py-1.5 rounded-lg border border-teal-800/80 hover:bg-teal-950/40 transition-colors"
                          >
                            + Add Working Hours
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={day}
                        className={`rounded-xl border p-4 sm:p-5 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                          schedule.is_active
                            ? "bg-slate-800 border-slate-700 shadow-2xs"
                            : "bg-slate-800/50 border-slate-800 opacity-75"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                schedule.is_active ? "bg-emerald-400" : "bg-slate-500"
                              }`}
                            />
                            <h2 className="text-base font-bold text-white">{schedule.day_of_week}</h2>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                schedule.is_active
                                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {schedule.is_active ? "Active" : "Disabled (Off)"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
                            <span className="flex items-center gap-1">
                              🕒 <strong>Hours:</strong> {schedule.start_time.slice(0, 5)} –{" "}
                              {schedule.end_time.slice(0, 5)}
                            </span>

                            {schedule.break_start && schedule.break_end ? (
                              <span className="flex items-center gap-1 text-slate-400">
                                ☕ <strong>Break:</strong> {schedule.break_start.slice(0, 5)} –{" "}
                                {schedule.break_end.slice(0, 5)}
                              </span>
                            ) : (
                              <span className="text-slate-500">No break</span>
                            )}

                            <span className="flex items-center gap-1 text-teal-300">
                              ⏱️ <strong>Slot:</strong> {schedule.appointment_duration} mins
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(schedule)}
                            disabled={togglingId === schedule.id}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              schedule.is_active
                                ? "border-slate-700 hover:bg-slate-700 text-slate-300"
                                : "border-emerald-700 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300"
                            }`}
                          >
                            {togglingId === schedule.id
                              ? "Updating..."
                              : schedule.is_active
                              ? "Disable Day"
                              : "Enable Day"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(schedule)}
                            className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(schedule)}
                            disabled={deletingId === schedule.id}
                            className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-900/60 hover:bg-rose-950/40 transition-colors"
                          >
                            {deletingId === schedule.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal / Slide-out Form for Adding / Editing */}
            {isFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
                <div className="w-full max-w-lg rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {editingSchedule ? `Edit Schedule — ${formDay}` : "Configure Working Day"}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Set working hours, break periods, and appointment duration.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="text-slate-400 hover:text-white text-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
                    {/* Validation Errors in Form */}
                    {formValidationErrors.length > 0 && (
                      <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-3.5 text-xs text-rose-200 space-y-1">
                        <div className="font-semibold text-rose-300">
                          Please resolve the following issues:
                        </div>
                        {formValidationErrors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}

                    {/* Day Selection */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Day of Week
                      </label>
                      <select
                        value={formDay}
                        onChange={(e) => setFormDay(e.target.value as DayOfWeek)}
                        disabled={Boolean(editingSchedule)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-hidden focus:border-teal-500 disabled:opacity-60"
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Working Hours */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={formStartTime}
                          onChange={(e) => setFormStartTime(e.target.value)}
                          required
                          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-hidden focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={formEndTime}
                          onChange={(e) => setFormEndTime(e.target.value)}
                          required
                          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-hidden focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {/* Break Option Toggle */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formHasBreak}
                          onChange={(e) => setFormHasBreak(e.target.checked)}
                          className="rounded-sm bg-slate-900 border-slate-700 text-teal-500 focus:ring-teal-500 h-4 w-4"
                        />
                        <span className="text-xs font-medium text-slate-200">
                          Include a break period during shift (e.g. Lunch)
                        </span>
                      </label>

                      {formHasBreak && (
                        <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Break Start
                            </label>
                            <input
                              type="time"
                              value={formBreakStart}
                              onChange={(e) => setFormBreakStart(e.target.value)}
                              required={formHasBreak}
                              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-white focus:outline-hidden focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Break End
                            </label>
                            <input
                              type="time"
                              value={formBreakEnd}
                              onChange={(e) => setFormBreakEnd(e.target.value)}
                              required={formHasBreak}
                              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-white focus:outline-hidden focus:border-teal-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Appointment Duration */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Appointment Slot Duration (Minutes)
                      </label>
                      <select
                        value={formDuration}
                        onChange={(e) => setFormDuration(Number(e.target.value))}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-hidden focus:border-teal-500"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={20}>20 minutes</option>
                        <option value={30}>30 minutes (Standard)</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Determines the length of consultation slots that can be scheduled during this shift.
                      </p>
                    </div>

                    {/* Active State */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="rounded-sm bg-slate-900 border-slate-700 text-teal-500 focus:ring-teal-500 h-4 w-4"
                        />
                        <span className="text-xs font-medium text-slate-200">
                          Mark this working day as active immediately
                        </span>
                      </label>
                    </div>

                    {/* Form Buttons */}
                    <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-4 py-2 rounded-lg border border-slate-700 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Working Day"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
