"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, role, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const dashboardPath = role === "doctor" ? "/doctor/dashboard" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs group-hover:bg-teal-700 transition-colors">
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
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Medi<span className="text-teal-600">Sphere</span>
            </span>
            <span className="text-[11px] font-medium text-slate-500 -mt-1 hidden sm:block">
              Doctor Discovery & Care
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/#specialities"
            className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
          >
            Specialities
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/#locations"
            className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors flex items-center gap-1.5"
          >
            <svg
              className="h-4 w-4 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Bhopal
          </Link>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/#specialities"
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 px-3 py-2 rounded-lg hover:bg-teal-50/60 transition-colors"
          >
            Find Doctors
          </Link>

          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href={dashboardPath}
                className="text-sm font-semibold text-slate-800 hover:text-teal-700 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>
                  {role === "doctor"
                    ? `Dr. ${profile?.full_name || "Doctor"}`
                    : profile?.full_name || "Dashboard"}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-medium text-slate-600 hover:text-rose-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/doctor/login"
                className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
              >
                Doctor Login
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-md">
          <div className="flex flex-col space-y-3">
            <Link
              href="/#specialities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Find Doctors
            </Link>
            <Link
              href="/#specialities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Specialities
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              How It Works
            </Link>
            <Link
              href="/#locations"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2"
            >
              <svg
                className="h-4 w-4 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Bhopal & Nearby Locations
            </Link>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              {user ? (
                <>
                  <Link
                    href={dashboardPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 text-center text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    Go to {role === "doctor" ? "Doctor Dashboard" : "Patient Dashboard"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full py-2 px-4 text-center text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded-lg"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 text-center text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/doctor/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 text-center text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                  >
                    Doctor Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
