"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { getAvailableSlots, getCurrentDateIST } from "@/lib/services/slots";
import { bookAppointment } from "@/lib/services/appointments";
import type { AppointmentSlot, DoctorWithDetails, Appointment } from "@/types";

interface BookingFlowProps {
  doctor: DoctorWithDetails;
}

function formatTime12h(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.slice(0, 2) : "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatSlotTimeRange(startTime: string, endTime: string): string {
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}

function getUpcomingDateList(startDate: string, daysCount: number = 14): string[] {
  const dates: string[] = [];
  const [year, month, day] = startDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  for (let i = 0; i < daysCount; i++) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cursor.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function formatDayLabel(dateStr: string, todayStr: string): { dayName: string; monthDay: string; isToday: boolean } {
  const isToday = dateStr === todayStr;
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const dayName = isToday
    ? "Today"
    : dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return { dayName, monthDay, isToday };
}

export default function BookingFlow({ doctor }: BookingFlowProps) {
  const { user, profile, role, loading: authLoading } = useAuth();
  const todayIST = getCurrentDateIST();
  const availableDates = getUpcomingDateList(todayIST, 14);

  const [selectedDate, setSelectedDate] = useState<string>(todayIST);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);

  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const reloadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const fetched = await getAvailableSlots(doctor.id, selectedDate);
      setSlots(fetched);
      setSelectedSlot((prev) => (prev && fetched.some((s) => s.id === prev.id) ? prev : null));
    } catch (err) {
      console.error("Failed to fetch slots:", err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctor.id, selectedDate]);

  useEffect(() => {
    let ignore = false;

    async function loadSlots() {
      try {
        const fetched = await getAvailableSlots(doctor.id, selectedDate);
        if (!ignore) {
          setSlots(fetched);
          setSelectedSlot((prev) => (prev && fetched.some((s) => s.id === prev.id) ? prev : null));
        }
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        if (!ignore) {
          setSlots([]);
        }
      } finally {
        if (!ignore) {
          setLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => {
      ignore = true;
    };
  }, [doctor.id, selectedDate]);

  const handleDateChange = (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setBookingError(null);
    setLoadingSlots(true);
  };

  const handleSelectSlot = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
    setBookingError(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      setBookingError("Please select an available appointment slot.");
      return;
    }

    if (!user) {
      setBookingError("Please sign in to book your appointment.");
      return;
    }

    if (role && role !== "patient") {
      setBookingError("Only registered patient accounts can book doctor appointments.");
      return;
    }

    setBookingInProgress(true);
    setBookingError(null);

    try {
      const result = await bookAppointment({
        slotId: selectedSlot.id,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!result.success || !result.appointment) {
        setBookingError(
          result.error || "This appointment slot is no longer available. Please select another slot."
        );
        // Refresh slots immediately to show latest availability
        await reloadSlots();
        setSelectedSlot(null);
        return;
      }

      setConfirmedAppointment(result.appointment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to book appointment.";
      setBookingError(msg);
      await reloadSlots();
      setSelectedSlot(null);
    } finally {
      setBookingInProgress(false);
    }
  };

  const doctorName = doctor.profile?.full_name
    ? doctor.profile.full_name.toLowerCase().startsWith("dr.")
      ? doctor.profile.full_name
      : `Dr. ${doctor.profile.full_name}`
    : "Verified Doctor";

  const specialityName = doctor.speciality?.name || "General Healthcare";
  const clinicName = doctor.clinic?.name || "Bhopal Healthcare Center";
  const clinicAddress = doctor.clinic?.address || "Bhopal, Madhya Pradesh";

  // ============================================================================
  // CONFIRMATION VIEW (Requirement 12)
  // ============================================================================
  if (confirmedAppointment) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Success Header */}
        <div className="bg-emerald-600 text-white p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 mb-4 ring-8 ring-white/10">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Appointment Confirmed
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-emerald-100 max-w-md mx-auto">
            Your appointment has been successfully scheduled and secured in the database.
          </p>
        </div>

        {/* Confirmation Details Card */}
        <div className="p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Appointment ID
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                {confirmedAppointment.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Doctor
                </span>
                <span className="mt-1 block text-base font-bold text-slate-900">
                  {doctorName}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Speciality
                </span>
                <span className="mt-1 block text-base font-semibold text-teal-700">
                  {specialityName}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Clinic
                </span>
                <span className="mt-1 block text-sm font-medium text-slate-800">
                  {clinicName}
                </span>
                <span className="block text-xs text-slate-500">
                  {clinicAddress}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 capitalize">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                  {confirmedAppointment.status}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Date
                </span>
                <span className="mt-1 block text-sm font-bold text-slate-900">
                  {new Date(`${confirmedAppointment.appointment_date}T12:00:00Z`).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Time
                </span>
                <span className="mt-1 block text-sm font-bold text-slate-900">
                  {formatSlotTimeRange(confirmedAppointment.start_time, confirmedAppointment.end_time)}
                </span>
              </div>
            </div>

            {confirmedAppointment.reason && (
              <div className="pt-3 border-t border-slate-200">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reason for Visit
                </span>
                <span className="mt-1 block text-sm text-slate-700">
                  {confirmedAppointment.reason}
                </span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/dashboard/appointments"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
            >
              <span>View in My Appointments</span>
              <span>→</span>
            </Link>

            <Link
              href="/doctors"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Find More Doctors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // BOOKING FORM VIEW
  // ============================================================================
  return (
    <div className="space-y-8">
      {/* Doctor Summary Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Verified Practitioner
              </span>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                {specialityName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {doctorName}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {clinicName} • {clinicAddress}
            </p>
          </div>

          {doctor.consultation_fee !== null && doctor.consultation_fee !== undefined && (
            <div className="sm:text-right shrink-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Consultation Fee
              </span>
              <span className="text-2xl font-extrabold text-slate-900">
                ₹{doctor.consultation_fee}
              </span>
              <span className="block text-[11px] text-slate-500">Pay at clinic</span>
            </div>
          )}
        </div>
      </div>

      {/* Booking Flow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Step 1 (Date Selection) & Step 2 (Slot Selection) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Date */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                  Step 1
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Select Appointment Date
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">Asia/Kolkata (IST)</span>
            </div>

            {/* Date Selection Scroll Container */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {availableDates.map((dateStr) => {
                const { dayName, monthDay } = formatDayLabel(dateStr, todayIST);
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDateChange(dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[76px] py-3 px-2 rounded-2xl border text-center transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-teal-600 border-teal-600 text-white shadow-sm ring-2 ring-teal-600/20"
                        : "bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider ${
                        isSelected ? "text-teal-100" : "text-slate-500"
                      }`}
                    >
                      {dayName}
                    </span>
                    <span className="text-sm font-bold mt-0.5">
                      {monthDay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Available Slots */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                  Step 2
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Available Slots
                </h2>
              </div>
              {!loadingSlots && (
                <span className="text-xs font-semibold text-slate-500">
                  {slots.length} {slots.length === 1 ? "slot" : "slots"} available
                </span>
              )}
            </div>

            {/* Error Banner */}
            {bookingError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-rose-600 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold">Booking notice</p>
                  <p className="text-xs mt-0.5 leading-relaxed">{bookingError}</p>
                </div>
              </div>
            )}

            {/* Slots Grid */}
            {loadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <div className="h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Checking available slots...</span>
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center space-y-2">
                <svg
                  className="mx-auto h-8 w-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-semibold text-slate-700">
                  No appointments are currently available for this date.
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Please select another date above or check back later for newly scheduled clinic hours.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSelectSlot(slot)}
                      className={`py-3 px-3 rounded-xl border text-center transition-all cursor-pointer font-semibold text-xs flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-teal-600 border-teal-600 text-white shadow-sm ring-2 ring-teal-600/20"
                          : "bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40"
                      }`}
                    >
                      <span className="text-xs font-bold">
                        {formatTime12h(slot.start_time)}
                      </span>
                      <span
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? "text-teal-100" : "text-slate-400"
                        }`}
                      >
                        to {formatTime12h(slot.end_time)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Booking Summary & Confirmation */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Booking Details
            </h2>

            {/* Patient Info */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Patient Name
              </span>
              <span className="mt-1 block text-sm font-bold text-slate-900">
                {profile?.full_name || user?.email || (authLoading ? "Loading..." : "Guest (Sign in required)")}
              </span>
            </div>

            {/* Doctor Info */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Doctor
              </span>
              <span className="mt-1 block text-sm font-semibold text-slate-800">
                {doctorName}
              </span>
              <span className="text-xs text-teal-700 block">{specialityName}</span>
            </div>

            {/* Clinic Info */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Clinic
              </span>
              <span className="mt-1 block text-sm text-slate-800 font-medium">
                {clinicName}
              </span>
            </div>

            {/* Selected Date & Time */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="font-bold text-slate-900">
                  {new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Time:</span>
                <span className="font-bold text-slate-900">
                  {selectedSlot
                    ? formatSlotTimeRange(selectedSlot.start_time, selectedSlot.end_time)
                    : "Not selected"}
                </span>
              </div>
            </div>

            {/* Optional Reason for visit */}
            <div className="space-y-1.5">
              <label
                htmlFor="reason"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Reason for visit <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief reason for consultation (e.g. Skin rash, routine checkup)"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-800 placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="notes"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Notes for Doctor <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or symptoms for the practitioner"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-800 placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Auth Warning or Confirmation Action */}
            {!user ? (
              <div className="pt-2 space-y-3">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  Please sign in with your patient account to book an appointment.
                </div>
                <Link
                  href={`/login?redirect=/doctors/${doctor.id}/book`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
                >
                  Sign In to Continue
                </Link>
              </div>
            ) : role === "doctor" ? (
              <div className="pt-2">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  You are signed in as a Doctor. Patient appointments must be booked with a patient account.
                </div>
              </div>
            ) : (
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={!selectedSlot || bookingInProgress}
                  onClick={handleConfirmBooking}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold shadow-xs transition-colors ${
                    !selectedSlot || bookingInProgress
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-teal-600 text-white hover:bg-teal-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  }`}
                >
                  {bookingInProgress ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Securing Booking...</span>
                    </>
                  ) : (
                    <span>Confirm Appointment</span>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-400">
                  Protected with database-level double booking prevention
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
