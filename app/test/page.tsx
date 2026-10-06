import React from "react";
import Link from "next/link";

export default function TestIndexPage() {
  const testLinks = [
    {
      title: "1. Specialities Test",
      href: "/test/specialities",
      description:
        "Fetches and displays the 6 core medical specialities from Supabase: Dermatology, ENT, Dentistry, Cardiology, Neurology, Orthopedics.",
      badge: "6 Seeded Specialities",
    },
    {
      title: "2. Verified Doctors Test",
      href: "/test/doctors",
      description:
        "Fetches verified doctors (verification_status = 'verified'). Displays 'No verified doctors available yet.' if none exist in the database.",
      badge: "Zero Mock Data",
    },
    {
      title: "3. Clinics Test",
      href: "/test/clinics",
      description:
        "Fetches clinics from the Supabase clinics table. Displays 'No clinics available yet.' if none exist in the database.",
      badge: "Zero Mock Data",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            href="/"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 mb-2"
          >
            ← Back to MediSphere Home
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Phase 5 — Test Suite Pages
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Verification suite for Doctor and Clinic data structures, Supabase services, and zero-mock data integrity checks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-md hover:border-teal-500 transition-all flex flex-col justify-between group"
            >
              <div>
                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 mb-3">
                  {item.badge}
                </span>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                  {item.title}
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
                <span>Run Test Page</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
