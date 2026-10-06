"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getDoctors } from "@/lib/services";
import type { DoctorWithDetails } from "@/types";

export default function TestDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctors();
      setDoctors(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const data = await getDoctors();
        if (!ignore) {
          setDoctors(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Unknown error occurred";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumbs / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href="/" className="hover:text-teal-600 transition-colors">
                MediSphere
              </Link>
              <span>/</span>
              <span className="text-slate-400">Test Pages</span>
              <span>/</span>
              <span className="font-semibold text-teal-700">Doctors</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Verified Doctors Test
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Queries Supabase with <code className="bg-slate-100 text-teal-700 px-1.5 py-0.5 rounded text-xs">verification_status = &quot;verified&quot;</code> filter. Strictly adheres to zero mock/placeholder doctor records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/test/specialities"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              ← Test Specialities
            </Link>
            <Link
              href="/test/clinics"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              Test Clinics →
            </Link>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-2xs">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-sm">Supabase Query Notice</p>
                <p className="text-xs text-amber-800 mt-1">{error}</p>
                <p className="text-xs text-amber-700 mt-2">
                  Verify that <code className="bg-amber-100 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> is properly configured in <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-28 rounded-xl bg-white border border-slate-200 p-5 animate-pulse flex flex-col justify-between">
                <div className="h-5 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-72 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Real Verified Doctors List (if any exist in database) */}
        {!loading && doctors.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              <span>Verified Doctors ({doctors.length})</span>
              <span className="text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Live Verified Providers
              </span>
            </div>

            <div className="space-y-4">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {doc.profile?.full_name ? `Dr. ${doc.profile.full_name}` : "Doctor"}
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Verified
                        </span>
                      </div>
                      <p className="text-xs font-medium text-teal-600 mt-0.5">
                        {doc.speciality?.name || "Specialist"} • {doc.qualification || "MBBS"}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
                        {doc.about || "No biography available."}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      {doc.consultation_fee !== null && (
                        <div className="text-sm font-bold text-slate-900">
                          ₹{doc.consultation_fee} <span className="text-xs font-normal text-slate-500">fee</span>
                        </div>
                      )}
                      {doc.experience_years !== null && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {doc.experience_years} years experience
                        </p>
                      )}
                      {doc.clinic?.name && (
                        <p className="text-xs text-slate-500 mt-1">
                          📍 {doc.clinic.name} ({doc.clinic.city || "Bhopal"})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>ID: {doc.id.slice(0, 8)}...</span>
                    <span>Status: {doc.verification_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Mandatory requirement: "No verified doctors available yet." */}
        {!loading && doctors.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              No verified doctors available yet.
            </h2>
            <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
              The database currently contains no doctor accounts with verification status marked as &quot;verified&quot;. Placeholder or mock doctors are strictly disallowed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
