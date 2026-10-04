"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function PatientDashboardPage() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <ProtectedRoute allowedRoles={["patient"]} redirectPath="/login">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navigation Bar */}
        <header className="border-b border-slate-200 bg-white shadow-2xs">
          <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
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
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Medi<span className="text-teal-600">Sphere</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Patient Account
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="flex-1 py-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Verified Session
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Patient Dashboard
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Welcome back, {profile?.full_name || "Patient"}.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    Browse Specialities
                  </Link>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Full Name
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-900 truncate">
                    {profile?.full_name || "—"}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Email
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-900 truncate">
                    {profile?.email || user?.email || "—"}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Phone
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-900 truncate">
                    {profile?.phone || "—"}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Location
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-900 truncate">
                    {profile?.location || "Bhopal, MP"}
                  </span>
                </div>
              </div>
            </div>

            {/* Phase 4 Status Card */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0 mt-0.5">
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-teal-950">
                    Phase 4 Authentication Foundation Active
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-teal-800 leading-relaxed">
                    Your patient session is active and role validation has been verified
                    against the Supabase database. Doctor listings, real-time availability slots,
                    and appointment bookings will be connected in subsequent phases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
