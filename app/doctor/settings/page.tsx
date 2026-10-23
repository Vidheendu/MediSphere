"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DoctorDashboardNav from "@/components/dashboard/DoctorDashboardNav";
import {
  getDoctorSelfDetails,
  updateDoctorProfileDetails,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/services/profiles";
import type { Doctor, Profile } from "@/types";

export default function DoctorSettingsPage() {
  const { user, profile: authProfile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState<string>("");
  const [consultationFee, setConsultationFee] = useState<string>("");
  const [about, setAbout] = useState("");

  const [saving, setSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Notification preferences
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailAlerts: true,
    appointmentReminders: true,
    statusUpdates: true,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [docData, p] = await Promise.all([
        getDoctorSelfDetails(),
        getNotificationPreferences(),
      ]);

      if (docData.profile) {
        setProfile(docData.profile);
        setFullName(docData.profile.full_name || "");
        setPhone(docData.profile.phone || "");
        setLocation(docData.profile.location || "");
      } else if (authProfile) {
        setProfile(authProfile);
        setFullName(authProfile.full_name || "");
        setPhone(authProfile.phone || "");
        setLocation(authProfile.location || "");
      }

      if (docData.doctor) {
        setDoctor(docData.doctor);
        setQualification(docData.doctor.qualification || "");
        setExperienceYears(docData.doctor.experience_years !== null ? String(docData.doctor.experience_years) : "");
        setConsultationFee(docData.doctor.consultation_fee !== null ? String(docData.doctor.consultation_fee) : "");
        setAbout(docData.doctor.about || "");
      }

      setPrefs(p);
    } catch (err) {
      console.error("[DoctorSettingsPage] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [authProfile]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setProfileError("Full name must be at least 2 characters.");
      return;
    }
    if (trimmedName.length > 100) {
      setProfileError("Full name cannot exceed 100 characters.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const digits = trimmedPhone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        setProfileError("Please enter a valid 10 to 15 digit contact number.");
        return;
      }
    }

    const expNum = experienceYears.trim() ? parseInt(experienceYears.trim(), 10) : null;
    if (expNum !== null && (isNaN(expNum) || expNum < 0 || expNum > 70)) {
      setProfileError("Experience must be a valid number between 0 and 70 years.");
      return;
    }

    const feeNum = consultationFee.trim() ? parseFloat(consultationFee.trim()) : null;
    if (feeNum !== null && (isNaN(feeNum) || feeNum < 0 || feeNum > 50000)) {
      setProfileError("Consultation fee must be between 0 and 50,000 INR.");
      return;
    }

    try {
      setSaving(true);
      const res = await updateDoctorProfileDetails({
        full_name: trimmedName,
        phone: trimmedPhone || null,
        location: location.trim() || null,
        qualification: qualification.trim() || null,
        experience_years: expNum,
        consultation_fee: feeNum,
        about: about.trim() || null,
      });

      if (!res.success) {
        setProfileError(res.error || "Failed to update practitioner profile.");
        return;
      }

      await refreshProfile();
      if (res.doctor) setDoctor(res.doctor);
      if (res.profile) setProfile(res.profile);
      setProfileSuccess("Doctor profile and clinical information successfully updated.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setProfileError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    setPrefsError(null);
    setPrefsSuccess(null);
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);

    try {
      setPrefsSaving(true);
      const res = await updateNotificationPreferences(updated);
      if (res.success) {
        setPrefsSuccess("Notification preferences updated.");
      } else {
        setPrefsError(res.error || "Failed to update preferences.");
      }
    } catch {
      setPrefsError("Failed to update preferences.");
    } finally {
      setPrefsSaving(false);
    }
  };

  const isVerified = doctor?.verification_status === "verified";

  return (
    <ProtectedRoute allowedRoles={["doctor"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <DoctorDashboardNav />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Doctor Account Settings
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isVerified
                      ? "bg-teal-950 text-teal-300 border border-teal-700/80"
                      : "bg-amber-950 text-amber-300 border border-amber-800/80"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? "bg-teal-400" : "bg-amber-400"}`} />
                  {isVerified ? "Verified Practitioner" : "Verification Pending"}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Manage your public healthcare practitioner credentials, consultation rates, and notification alerts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/doctor/notifications"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-850 transition-colors"
              >
                <svg className="h-4 w-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Doctor Notifications</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-teal-400 border-t-transparent mb-3" />
              <p className="text-xs font-semibold text-slate-400">Loading doctor settings...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Profile Form & Notification Preferences */}
              <div className="lg:col-span-2 space-y-8">
                {/* Card 1: Professional Information */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
                  <div className="p-6 border-b border-slate-800 bg-slate-850/60 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">Practitioner Credentials</h2>
                      <p className="text-xs text-slate-400">
                        Information visible to patients during doctor discovery in Bhopal.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                    {profileSuccess && (
                      <div className="rounded-xl border border-teal-800 bg-teal-950/60 p-4 text-teal-300 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                        <svg className="h-4 w-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{profileSuccess}</span>
                      </div>
                    )}

                    {profileError && (
                      <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-4 text-rose-300 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                        <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{profileError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="sm:col-span-2">
                        <label htmlFor="docFullName" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Doctor Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          id="docFullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Dr. Rajesh Verma"
                          required
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label htmlFor="qualification" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Medical Qualification
                        </label>
                        <input
                          id="qualification"
                          type="text"
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                          placeholder="e.g. MBBS, MD (Cardiology)"
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label htmlFor="experienceYears" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Experience (Years)
                        </label>
                        <input
                          id="experienceYears"
                          type="number"
                          min="0"
                          max="70"
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value)}
                          placeholder="e.g. 12"
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label htmlFor="consultationFee" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Consultation Fee (INR ₹)
                        </label>
                        <input
                          id="consultationFee"
                          type="number"
                          min="0"
                          max="50000"
                          step="50"
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(e.target.value)}
                          placeholder="e.g. 800"
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">Displayed transparently to patients before booking.</p>
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Practice Contact Phone
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="location" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Clinic / Hospital Locality
                        </label>
                        <input
                          id="location"
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Shahpura, Bhopal"
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="about" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          About Practitioner & Clinical Focus
                        </label>
                        <textarea
                          id="about"
                          rows={4}
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                          placeholder="Provide a concise description of your medical background, clinical interests, and special focus..."
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold shadow-xs transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <span>Update Practitioner Profile</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Card 2: Notification Preferences */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
                  <div className="p-6 border-b border-slate-800 bg-slate-850/60">
                    <h2 className="text-base font-bold text-white">Practitioner Notification Alerts</h2>
                    <p className="text-xs text-slate-400">
                      Configure automated alerts when patients book visits or leave verified feedback.
                    </p>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {prefsSuccess && (
                      <div className="rounded-xl border border-teal-800 bg-teal-950/60 p-3 text-teal-300 text-xs font-medium">
                        {prefsSuccess}
                      </div>
                    )}
                    {prefsError && (
                      <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-rose-300 text-xs font-medium">
                        {prefsError}
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Item 1 */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                        <div className="pr-4">
                          <p className="text-sm font-bold text-slate-200">New Appointment Booking Notifications</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Receive notifications in your doctor portal when a patient books an available slot.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePref("appointmentReminders")}
                          disabled={prefsSaving}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            prefs.appointmentReminders ? "bg-teal-500" : "bg-slate-700"
                          }`}
                          aria-pressed={prefs.appointmentReminders}
                          aria-label="Toggle New Booking Alerts"
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-sm ring-0 transition duration-200 ease-in-out ${
                              prefs.appointmentReminders ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Item 2 */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                        <div className="pr-4">
                          <p className="text-sm font-bold text-slate-200">Daily Schedule & Patient Status Updates</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Receive summary notices regarding today&apos;s schedule and completed visits.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePref("statusUpdates")}
                          disabled={prefsSaving}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            prefs.statusUpdates ? "bg-teal-500" : "bg-slate-700"
                          }`}
                          aria-pressed={prefs.statusUpdates}
                          aria-label="Toggle Daily Schedule Alerts"
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-sm ring-0 transition duration-200 ease-in-out ${
                              prefs.statusUpdates ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Verification & Security Policy */}
              <div className="space-y-6">
                {/* Verification Box */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-md space-y-4">
                  <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                    Verification Status
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Status
                      </span>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isVerified
                              ? "bg-teal-950 text-teal-300 border border-teal-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? "bg-teal-400" : "bg-amber-400"}`} />
                          {doctor?.verification_status?.toUpperCase() || "PENDING"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Doctor Account ID
                      </span>
                      <span className="text-xs font-mono text-slate-300 break-all">
                        {doctor?.id || "Unassigned"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Registered Email
                      </span>
                      <span className="text-xs text-slate-300 break-all">
                        {profile?.email || user?.email || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
                      <p className="font-bold text-slate-300">Verification Policy:</p>
                      <p>
                        Practitioner verification is authorized strictly by MediSphere clinical administrators upon license validation. Doctors cannot self-modify verification status.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Doctor Help Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-850 rounded-2xl border border-slate-800 p-6 shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-teal-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-bold text-white">Doctor Support & FAQs</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Have questions about weekly schedule templates, generating 30-minute slots, or marking completed visits?
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/doctor/help"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300"
                    >
                      <span>Open Doctor Portal Help Center</span>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
