import React from "react";
import Link from "next/link";
import SpecialityIcon from "@/components/specialities/SpecialityIcon";

export default function Specialities() {
  const specialities = [
    {
      name: "Dermatology",
      slug: "dermatology",
      summary: "Skin, hair, and nail health including acne, allergies, and dermatological care.",
    },
    {
      name: "ENT",
      slug: "ent",
      summary: "Comprehensive ear, nose, throat, sinus, and hearing evaluation and treatments.",
    },
    {
      name: "Dentistry",
      slug: "dentistry",
      summary: "Oral checkups, cavity treatments, teeth cleaning, and dental procedures.",
    },
    {
      name: "Cardiology",
      slug: "cardiology",
      summary: "Cardiovascular health, ECG monitoring, heart assessments, and blood pressure care.",
    },
    {
      name: "Neurology",
      slug: "neurology",
      summary: "Nerve, spine, and brain consultations for persistent headaches and neurological health.",
    },
    {
      name: "Orthopedics",
      slug: "orthopedics",
      summary: "Bone health, joint pain relief, spine issues, fractures, and mobility therapy.",
    },
  ];

  return (
    <section id="specialities" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Medical Categories
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Specialities
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Find registered medical practitioners across key healthcare specialities in Bhopal.
          </p>
        </div>

        {/* 6 Specialities Grid with direct links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialities.map((item, index) => (
            <Link
              key={item.name}
              href={`/specialities/${item.slug}`}
              className="group bg-white rounded-2xl border border-slate-200 p-6 transition-all hover:border-teal-500 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-2xs">
                    <SpecialityIcon slug={item.slug} name={item.name} className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-400 group-hover:text-teal-600 transition-colors">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {item.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700 group-hover:text-teal-800">
                <span>Browse {item.name} Doctors</span>
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

        {/* View All Specialities Button */}
        <div className="mt-12 text-center">
          <Link
            href="/specialities"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 shadow-2xs hover:shadow-md transition-all"
          >
            <span>Explore All Specialities in Bhopal</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
