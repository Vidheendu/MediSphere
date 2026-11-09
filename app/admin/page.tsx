"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/services/admin";
import type { AdminDashboardStats } from "@/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadStats() {
      try {
        const data = await getAdminDashboardStats();
        if (!ignore) {
          setStats(data);
          setLastRefreshed(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load admin statistics.";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminDashboardStats();
      setStats(data);
      setLastRefreshed(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh statistics.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time platform governance and clinical oversight for MediSphere Bhopal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-slate-500">
              Updated: <strong className="text-slate-700">{lastRefreshed} IST</strong>
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={handleRefresh} className="underline text-xs font-semibold hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Doctors */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Doctors</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {loading ? "—" : stats?.total_doctors ?? 0}
            </span>
            <Link href="/admin/doctors" className="text-xs font-medium text-teal-700 hover:text-teal-800">
              Manage →
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Registered medical practitioners
          </p>
        </div>

        {/* Doctor Verification Status Highlight */}
        <div className="bg-white rounded-xl p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-colors bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-700 tracking-tight">
              {loading ? "—" : stats?.pending_doctors ?? 0}
            </span>
            <Link
              href="/admin/doctors?status=pending"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-100/60 hover:bg-amber-100 px-2.5 py-1 rounded-md transition-colors"
            >
              Verify Now
            </Link>
          </div>
          <p className="text-xs text-amber-700/80 mt-2">
            Doctors awaiting credential verification
          </p>
        </div>

        {/* Total Appointments */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {loading ? "—" : stats?.total_appointments ?? 0}
            </span>
            <Link href="/admin/appointments" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Confirmed consultations on record
          </p>
        </div>

        {/* Upcoming Appointments (Asia/Kolkata) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upcoming (IST)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-600 tracking-tight">
              {loading ? "—" : stats?.upcoming_appointments ?? 0}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Asia/Kolkata</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Scheduled for current or future IST slots
          </p>
        </div>
      </div>

      {/* Secondary Row: Clinics, Users, Reviews, Doctor Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Verification Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Doctor Credential Verification Status</h2>
            <Link
              href="/admin/doctors"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              All Doctors →
            </Link>
          </div>

          <p className="text-xs text-slate-500 mb-5">
            Public doctor listings and booking strictly require verified status. Unverified or rejected practitioners remain unlisted.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
                <span>Verified</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-2xl font-bold text-emerald-900">
                {loading ? "—" : stats?.verified_doctors ?? 0}
              </span>
              <p className="text-[11px] text-emerald-700/80 mt-1">Bookable publicly</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
                <span>Pending</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <span className="text-2xl font-bold text-amber-900">
                {loading ? "—" : stats?.pending_doctors ?? 0}
              </span>
              <p className="text-[11px] text-amber-700/80 mt-1">Requires audit</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
              <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
                <span>Rejected</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <span className="text-2xl font-bold text-rose-900">
                {loading ? "—" : stats?.rejected_doctors ?? 0}
              </span>
              <p className="text-[11px] text-rose-700/80 mt-1">Ineligible / Invalid</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-1">
                <span>Suspended</span>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
              <span className="text-2xl font-bold text-slate-800">
                {loading ? "—" : stats?.suspended_doctors ?? 0}
              </span>
              <p className="text-[11px] text-slate-600 mt-1">Temporarily locked</p>
            </div>
          </div>
        </div>

        {/* Database Entities Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Platform Directory Stats</h2>
          <div className="divide-y divide-slate-100">
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700">Total Clinics</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">{loading ? "—" : stats?.total_clinics ?? 0}</span>
                <Link href="/admin/clinics" className="text-xs text-indigo-600 hover:underline">Edit</Link>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700">Registered Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">{loading ? "—" : stats?.total_users ?? 0}</span>
                <Link href="/admin/users" className="text-xs text-indigo-600 hover:underline">View</Link>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700">Patient Reviews</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">{loading ? "—" : stats?.total_reviews ?? 0}</span>
                <Link href="/admin/reviews" className="text-xs text-indigo-600 hover:underline">Moderate</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Governance & Security Quick Links */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Security & Compliance</span>
          <h3 className="text-xl font-bold mt-1">Platform Governance Protocols Active</h3>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Row Level Security (RLS) is strictly enforced on all tables. All administrative mutations require
            verified admin authorization. Patients and doctors cannot escalate privileges or read each other&apos;s private data.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/doctors"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Review Pending Doctors
          </Link>
          <Link
            href="/admin/appointments"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            Inspect Appointments
          </Link>
          <Link
            href="/admin/clinics"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            Manage Clinics
          </Link>
        </div>
      </div>
    </div>
  );
}

