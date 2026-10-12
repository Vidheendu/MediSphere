"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PatientDashboardNav from "@/components/dashboard/PatientDashboardNav";
import { updatePatientProfile } from "@/lib/services/profiles";

interface ProfileFormProps {
  initialFullName: string;
  initialEmail: string;
  initialPhone: string;
  initialLocation: string;
  onSuccess: (msg: string) => void;
  refreshProfile: () => Promise<unknown>;
}

function ProfileEditForm({
  initialFullName,
  initialEmail,
  initialPhone,
  initialLocation,
  onSuccess,
  refreshProfile,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState<string>(initialFullName);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [location, setLocation] = useState<string>(initialLocation);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter a valid full name (at least 2 characters).");
      return;
    }

    if (trimmedName.length > 100) {
      setErrorMessage("Full name cannot exceed 100 characters.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const digits = trimmedPhone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        setErrorMessage("Please enter a valid 10-digit mobile or contact number.");
        return;
      }
    }

    const trimmedLocation = location.trim();
    if (trimmedLocation.length > 100) {
      setErrorMessage("Location cannot exceed 100 characters.");
      return;
    }

    try {
      setSaving(true);
      const result = await updatePatientProfile({
        full_name: trimmedName,
        phone: trimmedPhone || null,
        location: trimmedLocation || null,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to update profile. Please try again.");
        return;
      }

      await refreshProfile();
      onSuccess("Your profile information has been successfully updated.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
      {errorMessage && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900">
            Personal Information
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            These details are used for booking verification and clinic communications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="fullName"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Verma"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Your primary legal name as recognized on medical records.
            </p>
          </div>

          {/* Email (Read-Only) */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                disabled
                value={initialEmail}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
              <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-slate-400">
                Read-Only
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Email address is managed by your authentication credentials.
            </p>
          </div>

          {/* Contact Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used by clinics for appointment confirmations.
            </p>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              City / Area
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Arera Colony, Bhopal"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Your residential area or neighborhood in Bhopal.
            </p>
          </div>

          {/* Role (Protected / Read-Only) */}
          <div>
            <label
              htmlFor="role"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Account Role
            </label>
            <div className="relative">
              <input
                id="role"
                type="text"
                disabled
                value="patient"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 cursor-not-allowed uppercase"
              />
              <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-slate-400">
                Protected
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Roles are enforced by database security policies and cannot be modified.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-slate-500">
            Changes take effect immediately on your appointments and dashboard.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span>Save Changes</span>
                  <span>✓</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function PatientProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const initialFullName = profile?.full_name || (user?.user_metadata?.full_name as string) || "";
  const initialEmail = profile?.email || user?.email || "";
  const initialPhone = profile?.phone || (user?.user_metadata?.phone as string) || "";
  const initialLocation = profile?.location || (user?.user_metadata?.location as string) || "";

  const formKey = `${profile?.id || user?.id || "anon"}-${profile?.updated_at || "initial"}`;

  const handleSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  return (
    <ProtectedRoute allowedRoles={["patient"]} redirectPath="/login">
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <PatientDashboardNav />

        <main className="flex-1 py-8 sm:py-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/dashboard" className="hover:text-teal-600 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-teal-700 font-semibold">My Profile</span>
            </nav>

            {/* Header Title Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Account & Profile
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Patient Profile & Settings
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Review and update your contact information and consultation preferences.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-600"></span>
                    Patient Role
                  </span>
                </div>
              </div>
            </div>

            {/* Success Feedback Alert */}
            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-semibold">{successMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Profile Form Component */}
            <ProfileEditForm
              key={formKey}
              initialFullName={initialFullName}
              initialEmail={initialEmail}
              initialPhone={initialPhone}
              initialLocation={initialLocation}
              onSuccess={handleSuccess}
              refreshProfile={refreshProfile}
            />

            {/* Account Details & Security Note */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="h-4 w-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Security & Privacy</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your medical appointments and contact information are strictly isolated via PostgreSQL Row Level Security (RLS). Only you and the healthcare practitioners you book with have authorization to view your appointment history.
              </p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
