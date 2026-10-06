"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getClinics } from "@/lib/services";
import type { Clinic } from "@/types";

export default function TestClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClinics();
      setClinics(data);
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
        const data = await getClinics();
        if (!ignore) {
          setClinics(data);
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
              <span className="font-semibold text-teal-700">Clinics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Supabase Clinics Test
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Retrieves clinics directly from the Supabase <code className="bg-slate-100 text-teal-700 px-1.5 py-0.5 rounded text-xs">clinics</code> table. Zero mock or fake clinic records.
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
              href="/test/doctors"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              Test Doctors →
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-32 rounded-xl bg-white border border-slate-200 p-5 animate-pulse flex flex-col justify-between">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-56 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Real Clinics List (if any exist in database) */}
        {!loading && clinics.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              <span>Registered Clinics ({clinics.length})</span>
              <span className="text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Live Supabase Records
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinics.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                    <p className="text-xs text-slate-600 mt-1">
                      📍 {item.address ? `${item.address}, ` : ""}
                      {item.city || "Bhopal"}, {item.state || "Madhya Pradesh"} {item.pincode ? `- ${item.pincode}` : ""}
                    </p>
                    {item.phone && (
                      <p className="text-xs text-slate-500 mt-1">
                        📞 Phone: {item.phone}
                      </p>
                    )}
                    {item.website && (
                      <p className="text-xs text-teal-600 mt-1 truncate">
                        🌐 {item.website}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>ID: {item.id.slice(0, 8)}...</span>
                    <span>{item.city || "Bhopal"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Mandatory requirement: "No clinics available yet." */}
        {!loading && clinics.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              No clinics available yet.
            </h2>
            <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
              The database currently contains no clinic facilities. Placeholder or mock clinics are strictly disallowed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
