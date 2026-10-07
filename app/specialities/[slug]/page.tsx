import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SpecialityIcon from "@/components/specialities/SpecialityIcon";
import { getSpecialityBySlug, CANONICAL_SPECIALITIES } from "@/lib/services/specialities";
import { getDoctorsBySpecialityId } from "@/lib/services/doctors";
import DoctorCard from "@/components/doctors/DoctorCard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CANONICAL_SPECIALITIES.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const speciality = await getSpecialityBySlug(slug);

  if (!speciality) {
    return {
      title: "Speciality Not Found — MediSphere",
    };
  }

  return {
    title: `${speciality.name} Doctors in Bhopal — MediSphere`,
    description: `Find verified ${speciality.name} doctors and clinics in Bhopal. ${speciality.description || ""}`,
  };
}

export default async function SpecialityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const speciality = await getSpecialityBySlug(slug);

  if (!speciality) {
    notFound();
  }

  // Retrieve verified doctors from Supabase for this speciality
  const doctors = await getDoctorsBySpecialityId(speciality.id);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      <main className="flex-1">
        {/* Speciality Header & Breadcrumbs */}
        <section className="bg-white border-b border-slate-200 py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb Navigation & Back Link */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link href="/" className="hover:text-teal-600 transition-colors">
                  Home
                </Link>
                <span>/</span>
                <Link href="/specialities" className="hover:text-teal-600 transition-colors">
                  Specialities
                </Link>
                <span>/</span>
                <span className="text-teal-700 font-semibold">{speciality.name}</span>
              </nav>

              <Link
                href="/specialities"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
              >
                <span>←</span>
                <span>Back to All Specialities</span>
              </Link>
            </div>

            {/* Speciality Info Banner */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 shadow-2xs">
                <SpecialityIcon slug={speciality.slug} name={speciality.name} className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    Bhopal & Central MP
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    /{speciality.slug}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  {speciality.name} in Bhopal
                </h1>

                <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
                  {speciality.description || "Comprehensive clinical treatments and consultations with verified medical specialists in Bhopal."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Find Doctors Section */}
        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Section Title & Direct Link to /doctors?speciality=<slug> */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Find {speciality.name} Doctors
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Showing verified healthcare practitioners licensed for clinical practice in Bhopal.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs text-slate-500 font-medium">
                    {doctors.length} verified {doctors.length === 1 ? "doctor" : "doctors"} listed
                  </div>
                  <Link
                    href={`/doctors?speciality=${speciality.slug}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs"
                  >
                    <span>Search {speciality.name} in Discovery</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Discovery CTA Banner */}
              <div className="mt-6 rounded-2xl bg-gradient-to-r from-teal-50/80 via-white to-slate-50 border border-teal-100 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-2xs">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Search & Filter {speciality.name} Doctors
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Filter verified {speciality.name} specialists by clinic location, experience, and consultation fees across Bhopal.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/doctors?speciality=${speciality.slug}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs shrink-0"
                >
                  <span>Open Doctor Discovery</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Doctor Listing Area */}
            <div>
              {doctors.length > 0 ? (
                /* Reusable DoctorCard components for authentic doctors */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {doctors.map((doc) => (
                    <DoctorCard key={doc.id} doctor={doc} />
                  ))}
                </div>
              ) : (
                /* Clean Empty State — Strictly Required */
                <div className="rounded-2xl border border-slate-200 bg-white p-10 sm:p-14 text-center shadow-2xs">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-5 border border-teal-100">
                    <SpecialityIcon slug={speciality.slug} name={speciality.name} className="h-8 w-8" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">
                    No verified doctors are currently listed for this speciality.
                  </h3>

                  <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    MediSphere lists exclusively verified medical practitioners with confirmed credentials.
                    Real doctor and clinic records for {speciality.name} in Bhopal are currently undergoing verification.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={`/doctors?speciality=${speciality.slug}`}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-2xs transition-colors"
                    >
                      Search {speciality.name} in Discovery →
                    </Link>
                    <Link
                      href="/doctors"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                    >
                      Browse All Verified Doctors
                    </Link>
                    <Link
                      href="/doctor/login"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-2xs transition-colors"
                    >
                      Doctor Registration Portal →
                    </Link>
                  </div>
                </div>
              )}
            </div>


            {/* Verification Guarantee Footer Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Strict Credential Vetting
                  </h4>
                  <p className="text-xs text-slate-500">
                    All medical licenses and qualifications are verified against state and national medical council records.
                  </p>
                </div>
              </div>

              <Link
                href="/#how-it-works"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 shrink-0"
              >
                Learn How Verification Works →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
