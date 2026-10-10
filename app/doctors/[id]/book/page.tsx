import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingFlow from "@/components/booking/BookingFlow";
import { getDoctorById } from "@/lib/services/doctors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const doctor = await getDoctorById(id);

  if (!doctor || doctor.verification_status !== "verified") {
    return {
      title: "Doctor Not Found — MediSphere",
    };
  }

  const name = doctor.profile?.full_name ? `Dr. ${doctor.profile.full_name}` : "Verified Doctor";
  const spec = doctor.speciality?.name || "Medical Practitioner";

  return {
    title: `Book Appointment with ${name} (${spec}) — MediSphere`,
    description: `Schedule a confirmed appointment with ${name} at ${doctor.clinic?.name || "Bhopal"}. Real-time slot availability with instant database confirmation.`,
  };
}

export default async function DoctorBookingPage({ params }: PageProps) {
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center justify-between text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2 truncate">
              <Link href="/" className="hover:text-teal-600 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/doctors" className="hover:text-teal-600 transition-colors">
                Doctors
              </Link>
              <span>/</span>
              <Link href={`/doctors/${doctor.id}`} className="hover:text-teal-600 transition-colors truncate max-w-xs">
                {displayName}
              </Link>
              <span>/</span>
              <span className="text-teal-700 font-semibold">Book Appointment</span>
            </div>

            <Link
              href={`/doctors/${doctor.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors shrink-0"
            >
              <span>←</span>
              <span>Back to Profile</span>
            </Link>
          </nav>

          {/* Interactive Booking Flow */}
          <BookingFlow doctor={doctor} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
