"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PatientDashboardNav from "@/components/dashboard/PatientDashboardNav";
import {
  updatePatientProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/services/profiles";

export default function PatientSettingsPage() {
  const { profile, user, refreshProfile } = useAuth();

  // Profile fields state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Notification preferences state
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailAlerts: true,
    appointmentReminders: true,
    statusUpdates: true,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Initialize fields from auth context profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setLocation(profile.location || "");
    } else if (user?.user_metadata) {
      setFullName(user.user_metadata.full_name || "");
      setPhone(user.user_metadata.phone || "");
      setLocation(user.user_metadata.location || "");
    }
  }, [profile, user]);

  // Load notification preferences
  useEffect(() => {
    async function loadPrefs() {
      try {
        const p = await getNotificationPreferences();
        setPrefs(p);
      } catch {
        // Fallback to default
      }
    }
    loadPrefs();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
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

    const trimmedLocation = location.trim();
    if (trimmedLocation.length > 100) {
      setProfileError("Location cannot exceed 100 characters.");
      return;
    }

    try {
      setProfileSaving(true);
      const res = await updatePatientProfile({
        full_name: trimmedName,
        phone: trimmedPhone || null,
        location: trimmedLocation || null,
      });

      if (!res.success) {
        setProfileError(res.error || "Failed to update profile.");
        return;
      }

      await refreshProfile();
      setProfileSuccess("Your personal profile details have been successfully saved.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
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

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <PatientDashboardNav />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Account Settings
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage your personal contact info, notification delivery, and security preferences.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/notifications"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
              >
                <svg className="h-4 w-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>View Notifications</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Profile Form & Notification Preferences */}
            <div className="lg:col-span-2 space-y-8">
              {/* Card 1: Personal Profile */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                      <p className="text-xs text-slate-500">
                        Information used for your verified appointments and booking communications.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="p-6 sm:p-8 space-y-6">
                  {profileSuccess && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-teal-800 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                      <svg className="h-4 w-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                      <svg className="h-4 w-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{profileError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors bg-white text-slate-900"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Used for clinic appointment SMS and call confirmations.</p>
                    </div>

                    <div>
                      <label htmlFor="location" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        City / Area
                      </label>
                      <input
                        id="location"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Arera Colony, Bhopal"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors bg-white text-slate-900"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Helps doctors determine clinic location proximity.</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Account Email (Permanent)
                      </label>
                      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm">
                        <span>{profile?.email || user?.email || "No email bound"}</span>
                        <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-md bg-slate-200">
                          Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Primary account identifier. Bound to your authenticated MediSphere credentials.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2"
                    >
                      {profileSaving ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Profile Details</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: Notification Preferences */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Notification Preferences</h2>
                      <p className="text-xs text-slate-500">
                        Choose how and when MediSphere notifies you regarding appointments.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {prefsSuccess && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-teal-800 text-xs font-medium">
                      {prefsSuccess}
                    </div>
                  )}
                  {prefsError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-medium">
                      {prefsError}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Item 1 */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                      <div className="pr-4">
                        <p className="text-sm font-bold text-slate-800">Email Confirmation Receipts</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Receive official transactional confirmation emails immediately upon booking a visit.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePref("emailAlerts")}
                        disabled={prefsSaving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          prefs.emailAlerts ? "bg-teal-600" : "bg-slate-300"
                        }`}
                        aria-pressed={prefs.emailAlerts}
                        aria-label="Toggle Email Confirmation Receipts"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            prefs.emailAlerts ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                      <div className="pr-4">
                        <p className="text-sm font-bold text-slate-800">Appointment Reminders</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Receive notifications in your dashboard when your appointment date is approaching.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePref("appointmentReminders")}
                        disabled={prefsSaving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          prefs.appointmentReminders ? "bg-teal-600" : "bg-slate-300"
                        }`}
                        aria-pressed={prefs.appointmentReminders}
                        aria-label="Toggle Appointment Reminders"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            prefs.appointmentReminders ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                      <div className="pr-4">
                        <p className="text-sm font-bold text-slate-800">Visit Status & Review Alerts</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Get notified when your doctor marks a visit as completed or if any status change occurs.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePref("statusUpdates")}
                        disabled={prefsSaving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          prefs.statusUpdates ? "bg-teal-600" : "bg-slate-300"
                        }`}
                        aria-pressed={prefs.statusUpdates}
                        aria-label="Toggle Visit Status Alerts"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            prefs.statusUpdates ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Account Info & Security Badges */}
            <div className="space-y-6">
              {/* Account Overview Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Account Details
                </h3>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Account Type
                    </span>
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      Patient Account
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Registered Email
                    </span>
                    <span className="text-xs font-semibold text-slate-800 break-all">
                      {profile?.email || user?.email || "Unknown"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Member Since
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Active"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 leading-relaxed">
                    <strong>Role Security:</strong> Roles and access levels are strictly governed. Patients cannot modify their role or permissions.
                  </div>
                </div>
              </div>

              {/* Need Help Box */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-2xl border border-teal-200/80 p-6 shadow-xs">
                <div className="flex items-center gap-2.5 text-teal-800 mb-2">
                  <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="text-sm font-bold">Have Questions?</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Visit our Help Center for FAQs on booking appointments, cancellations, verified clinic locations, and leaving reviews.
                </p>
                <div className="mt-4">
                  <Link
                    href="/dashboard/help"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    <span>Open Patient Help Center</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
