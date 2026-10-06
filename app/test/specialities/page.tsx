"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSpecialities } from "@/lib/services";
import type { Speciality } from "@/types";

export default function TestSpecialitiesPage() {
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSpecialities();
      setSpecialities(data);
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
        const data = await getSpecialities();
        if (!ignore) {
          setSpecialities(data);
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
              <span className="font-semibold text-teal-700">Specialities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Supabase Specialities Test
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Retrieves medical specialities directly from the Supabase <code className="bg-slate-100 text-teal-700 px-1.5 py-0.5 rounded text-xs">specialities</code> table.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/test/doctors"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              Test Doctors →
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
                  Please verify that <code className="bg-amber-100 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> are set in <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code> and that the Phase 3 schema has been executed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="h-36 rounded-xl bg-white border border-slate-200 p-5 animate-pulse flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                  <div className="h-3 w-40 bg-slate-100 rounded" />
                </div>
                <div className="h-3 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Data Display */}
        {!loading && specialities.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              <span>Retrieved Specialities ({specialities.length})</span>
              <span className="text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Live Supabase Data
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specialities.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {item.slug}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>ID: {item.id.slice(0, 8)}...</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && specialities.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">No specialities found</h3>
            <p className="mt-1 text-xs text-slate-500">
              The specialities table in Supabase returned 0 rows. Run the Phase 3 schema seed script to insert the 6 specialities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
