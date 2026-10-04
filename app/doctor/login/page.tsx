"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function DoctorLoginPage() {
  const router = useRouter();
  const { signInDoctor, user, role } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in as doctor, redirect to doctor dashboard
  React.useEffect(() => {
    if (user && role === "doctor") {
      router.replace("/doctor/dashboard");
    }
  }, [user, role, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setErrorMessage("Please enter a valid medical provider email.");
      return;
    }
    if (!formData.password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signInDoctor({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (!res.success) {
        setErrorMessage(
          res.error ||
            "Access denied. Please check your credentials or doctor account status."
        );
        return;
      }

      router.push("/doctor/dashboard");
    } catch {
      setErrorMessage("An unexpected error occurred during doctor authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-slate-950 shadow-xs group-hover:bg-teal-400 transition-colors">
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
              <circle
                cx="12"
                cy="12"
                r="9"
                strokeWidth={2}
                stroke="currentColor"
                strokeDasharray="1 3"
              />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Medi<span className="text-teal-400">Sphere</span>
          </span>
        </Link>

        {/* Doctor portal badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/60 px-3 py-1 text-xs font-semibold text-teal-300 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
          Healthcare Provider Portal
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Doctor Login
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Secure authentication for registered doctors & medical clinics in Bhopal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-800 py-8 px-6 shadow-xl border border-slate-700 rounded-xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {errorMessage && (
              <div className="rounded-lg bg-rose-950/70 border border-rose-700/60 p-3.5 text-xs sm:text-sm text-rose-200 flex items-start gap-2.5">
                <svg
                  className="h-5 w-5 text-rose-400 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
              >
                Provider Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="doctor@hospital.org"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden focus:ring-1 focus:ring-teal-400"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter provider password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-hidden focus:ring-1 focus:ring-teal-400"
              />
            </div>

            {/* Role Security Warning */}
            <div className="rounded-md bg-slate-900/60 border border-slate-700/60 p-2.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0"></span>
              <span>
                Access requires verified <strong>doctor</strong> role in the MediSphere registry.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-slate-950"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Verifying Doctor Credentials...
                </span>
              ) : (
                "Sign In to Doctor Portal"
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-slate-700 flex flex-col gap-2.5 text-center text-xs text-slate-400">
            <div>
              Looking for doctor appointments as a patient?{" "}
              <Link
                href="/login"
                className="font-medium text-teal-400 hover:text-teal-300 underline"
              >
                Patient Login →
              </Link>
            </div>
            <div>
              <Link
                href="/"
                className="hover:text-slate-300 transition-colors"
              >
                ← Back to MediSphere Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
