"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function DoctorDashboardPage() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/doctor/login");
  };

  return (
    <ProtectedRoute allowedRoles={["doctor"]} redirectPath="/doctor/login">
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Top Provider Bar */}
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
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                Verified Doctor Portal
              </span>
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

        {/* Doctor Dashboard Content */}
        <main className="flex-1 py-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Header Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 sm:p-8 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-2">
                    <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                    Doctor Workspace
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    Doctor Dashboard
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Dr. {profile?.full_name || "Doctor"} — Practice overview & credentials
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/doctor/slots"
                    className="inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors"
                  >
                    View Slots →
                  </Link>
                  <Link
                    href="/doctor/schedule"
                    className="inline-flex items-center justify-center rounded-lg border border-teal-500/80 bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Manage Schedule
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-2 text-xs sm:text-sm font-medium transition-colors"
                  >
                    Homepage
                  </Link>
                </div>
              </div>

              {/* Doctor Details Grid */}
              <div className="mt-8 pt-6 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg bg-slate-900/80 border border-slate-700/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Doctor Name
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-white truncate">
                    {profile?.full_name ? `Dr. ${profile.full_name}` : "—"}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-900/80 border border-slate-700/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Registered Email
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-white truncate">
                    {profile?.email || user?.email || "—"}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-900/80 border border-slate-700/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Phone
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-white truncate">
                    {profile?.phone || "—"}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-900/80 border border-slate-700/80 p-3.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Role & Region
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-teal-300 truncate">
                    Doctor • {profile?.location || "Bhopal"}
                  </span>
                </div>
              </div>
            </div>

            {/* Phase 10: Schedule & Availability Section */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 sm:p-7 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Doctor Availability & Consultation Schedule
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      Configure your weekly working days, clinic shift hours, lunch break periods, and appointment slot durations. Only active days are discoverable by patients.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    href="/doctor/schedule"
                    className="inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 text-xs sm:text-sm font-semibold transition-colors w-full sm:w-auto"
                  >
                    Open Schedule Manager →
                  </Link>
                </div>
              </div>
            </div>

            {/* Phase 11: Appointment Slots Section */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 sm:p-7 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Appointment Slot Management
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      Generate date-specific consultation slots from your recurring schedule. Inspect available slots and block specific hours when needed. (Asia/Kolkata).
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    href="/doctor/slots"
                    className="inline-flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 text-xs sm:text-sm font-semibold transition-colors w-full sm:w-auto"
                  >
                    Manage Slots →
                  </Link>
                </div>
              </div>
            </div>

            {/* Provider Foundation Card */}
            <div className="rounded-xl border border-teal-800/80 bg-teal-950/40 p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-500 text-slate-950 shrink-0 mt-0.5">
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
                  <h3 className="text-base font-semibold text-teal-200">
                    Doctor Identity & Role Verified
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Doctor portal access is secured via Supabase Role-Based Access Control.
                    Only authenticated healthcare providers can configure schedules and manage clinic availability.
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
