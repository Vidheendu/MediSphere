import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getDoctorById } from "@/lib/services/doctors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const doctor = await getDoctorById(id);

  if (!doctor || doctor.verification_status !== "verified") {
    return {
      title: "Doctor Profile Not Found — MediSphere",
    };
  }

  const name = doctor.profile?.full_name ? `Dr. ${doctor.profile.full_name}` : "Verified Doctor";
  const spec = doctor.speciality?.name || "Medical Practitioner";

  return {
    title: `${name} — ${spec} in Bhopal | MediSphere`,
    description: `Consult ${name}, a verified ${spec} practicing at ${doctor.clinic?.name || "Bhopal"}. Real credentials verified by MediSphere.`,
  };
}

export default async function DoctorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const doctor = await getDoctorById(id);

  if (!doctor || doctor.verification_status !== "verified") {
    notFound();
  }

  const profileName = doctor.profile?.full_name?.trim();
  const displayName = profileName
    ? profileName.toLowerCase().startsWith("dr.") || profileName.toLowerCase().startsWith("dr ")
      ? profileName
      : `Dr. ${profileName}`
    : "Verified Doctor";

  const initials = profileName
    ? profileName
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MD";

  // Authentic rating: only displayed if legitimately available
  const legitimateRating =
    typeof (doctor as unknown as Record<string, unknown>).rating === "number"
      ? ((doctor as unknown as Record<string, unknown>).rating as number)
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center justify-between text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <Link href="/" className="hover:text-teal-600 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/doctors" className="hover:text-teal-600 transition-colors">
                Doctors
              </Link>
              <span>/</span>
              <span className="text-teal-700 font-semibold truncate max-w-xs">{displayName}</span>
            </div>

            <Link
              href="/doctors"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
            >
              <span>←</span>
              <span>Back to All Doctors</span>
            </Link>
          </nav>

          {/* Doctor Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 text-teal-700 font-extrabold text-2xl sm:text-3xl shadow-xs">
                <span>{initials}</span>
                <span
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-3 ring-white"
                  title="Verified Practitioner"
                >
                  <svg
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              </div>

              {/* Bio & Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    {displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Verified Practitioner
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                  {doctor.speciality && (
                    <Link
                      href={`/doctors?speciality=${doctor.speciality.slug}`}
                      className="font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 hover:bg-teal-100 transition-colors"
                    >
                      {doctor.speciality.name}
                    </Link>
                  )}

                  {doctor.qualification && (
                    <span className="font-medium text-slate-700">
                      {doctor.qualification}
                    </span>
                  )}

                  {doctor.experience_years !== null &&
                    doctor.experience_years !== undefined &&
                    doctor.experience_years >= 0 && (
                      <span className="text-slate-500">
                        • {doctor.experience_years} years clinical experience
                      </span>
                    )}
                </div>

                {/* Rating if legitimately available */}
                {legitimateRating !== null && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{legitimateRating.toFixed(1)} Authentic Rating</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid: Practice Information & About */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column (2 Cols): Biography & Speciality */}
            <div className="md:col-span-2 space-y-6">
              {/* About Section */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-900 mb-3">
                  About Practitioner
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
                  {doctor.about ||
                    "Practicing specialist with verified medical qualifications serving patients in Bhopal."}
                </p>
              </div>

              {/* Speciality Overview */}
              {doctor.speciality && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
                  <h2 className="text-lg font-bold text-slate-900 mb-2">
                    Department of {doctor.speciality.name}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {doctor.speciality.description ||
                      "Clinical consultations and procedures within this medical domain."}
                  </p>
                  <div className="mt-4">
                    <Link
                      href={`/doctors?speciality=${doctor.speciality.slug}`}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                    >
                      Browse other {doctor.speciality.name} doctors →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (1 Col): Clinic & Consultation Details */}
            <div className="space-y-6">
              {/* Consultation Details */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Consultation
                </h3>
                {doctor.consultation_fee !== null &&
                doctor.consultation_fee !== undefined &&
                doctor.consultation_fee >= 0 ? (
                  <div>
                    <span className="text-2xl font-extrabold text-slate-900">
                      ₹{doctor.consultation_fee}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5">per visit</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Consultation fee determined upon appointment.
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <Link
                    href={`/doctors/${doctor.id}/book`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Book Appointment</span>
                  </Link>
                  <p className="text-[11px] text-center text-slate-500 mt-2">
                    Instant confirmation • Verified practitioner
                  </p>
                </div>
              </div>

              {/* Clinic Information */}
              {doctor.clinic && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Clinic & Hospital Location
                  </h3>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {doctor.clinic.name}
                    </h4>
                    {doctor.clinic.address && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {doctor.clinic.address}
                      </p>
                    )}
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      {doctor.clinic.city || "Bhopal"}, {doctor.clinic.state || "Madhya Pradesh"}{" "}
                      {doctor.clinic.pincode ? `- ${doctor.clinic.pincode}` : ""}
                    </p>
                  </div>

                  {doctor.clinic.phone && (
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center gap-1.5">
                      <span>📞 Clinic Contact:</span>
                      <span className="font-semibold">{doctor.clinic.phone}</span>
                    </div>
                  )}

                  {doctor.clinic.website && (
                    <div className="text-xs text-teal-600">
                      <a
                        href={doctor.clinic.website}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        <span>Visit Clinic Website</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
