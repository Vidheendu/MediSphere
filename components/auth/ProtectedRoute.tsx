"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserRole } from "@/types/database";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  redirectPath?: string;
  children: React.ReactNode;
}

export default function ProtectedRoute({
  allowedRoles,
  redirectPath,
  children,
}: ProtectedRouteProps) {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();

  const defaultRedirect = allowedRoles.includes("doctor")
    ? "/doctor/login"
    : "/login";
  const targetRedirect = redirectPath || defaultRedirect;

  useEffect(() => {
    if (!loading && !user) {
      router.replace(targetRedirect);
    }
  }, [user, loading, router, targetRedirect]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white animate-pulse mb-4 shadow-xs">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // Unauthenticated State (before redirect takes effect)
  if (!user) {
    return null;
  }

  // Role Mismatch / Access Denied State
  if (role && !allowedRoles.includes(role)) {
    const isDoctorArea = allowedRoles.includes("doctor");
    const correctDashboard = role === "doctor" ? "/doctor/dashboard" : "/dashboard";

    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-xl border border-rose-200 p-6 sm:p-8 shadow-xs text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            Access Restricted
          </h1>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {isDoctorArea
              ? "This section is restricted strictly to verified healthcare providers. Patient accounts cannot access the Doctor Portal."
              : "This dashboard is configured for patients. Doctor accounts cannot access the Patient Dashboard."}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push(correctDashboard)}
              className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors"
            >
              Go to Your Dashboard
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push(targetRedirect);
              }}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
