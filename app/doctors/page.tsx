import React, { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DoctorListingClient from "@/components/doctors/DoctorListingClient";

export const metadata = {
  title: "Find Verified Doctors in Bhopal — MediSphere",
  description:
    "Discover and search verified medical specialists and clinics in Bhopal. Browse doctors by speciality, location, experience, and fee with zero mock data.",
};

function DoctorListingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-pulse space-y-8">
      <div className="h-20 bg-slate-200/80 rounded-2xl w-3/4 max-w-md" />
      <div className="h-44 bg-slate-200/60 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-60 bg-slate-200/60 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      <main className="flex-1">
        <Suspense fallback={<DoctorListingSkeleton />}>
          <DoctorListingClient />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
