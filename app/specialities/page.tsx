import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SpecialityIcon from "@/components/specialities/SpecialityIcon";
import { getSpecialities } from "@/lib/services/specialities";

export const metadata = {
  title: "Medical Specialities in Bhopal — MediSphere",
  description:
    "Explore registered healthcare specialities in Bhopal: Dermatology, ENT, Dentistry, Cardiology, Neurology, and Orthopedics. Find verified medical doctors.",
};

export default async function SpecialitiesPage() {
  const specialities = await getSpecialities();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      <main className="flex-1">
        {/* Page Hero Header */}
        <section className="bg-white border-b border-slate-200 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
              <Link href="/" className="hover:text-teal-600 transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-teal-700 font-semibold">Specialities</span>
            </nav>

            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600"></span>
                Bhopal Healthcare Network
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
                Medical Specialities
              </h1>
              <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                Browse healthcare departments to find verified doctors and clinics in Bhopal.
                Every listed practitioner undergoes strict verification before being displayed.
              </p>
            </div>
          </div>
        </section>

        {/* Specialities Grid Section */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  All Specialities ({specialities.length})
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Select a category to view verified specialist doctors and consultation details.
                </p>
              </div>
              <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600">
                Bhopal, MP
              </span>
            </div>

            {/* Responsive Grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialities.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/specialities/${item.slug}`}
                  className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md hover:border-teal-500 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Icon & Index Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-2xs">
                        <SpecialityIcon slug={item.slug} name={item.name} className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-400 group-hover:text-teal-600 transition-colors">
                        0{index + 1}
                      </span>
                    </div>

                    {/* Speciality Name */}
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {item.name}
                    </h3>

                    {/* Short Description */}
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {item.description || "Comprehensive clinical care and verified specialist consultations."}
                    </p>
                  </div>

                  {/* Action Link Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-teal-600 group-hover:text-teal-700">
                    <span>View {item.name} Doctors</span>
                    <svg
                      className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quality & Verification Notice */}
            <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xs">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Zero Placeholder Guarantee
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    MediSphere lists exclusively verified medical practitioners. We do not generate mock doctors or simulated ratings. If a category is undergoing verification, only confirmed providers are displayed.
                  </p>
                </div>
              </div>

              <Link
                href="/doctor/login"
                className="shrink-0 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs text-center"
              >
                Are you a Doctor? Join MediSphere →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
