"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DoctorDashboardNav from "@/components/dashboard/DoctorDashboardNav";

interface DoctorFaqItem {
  id: string;
  category: "schedule" | "slots" | "visits" | "verification" | "reviews";
  question: string;
  answer: string;
}

const DOCTOR_FAQS: DoctorFaqItem[] = [
  {
    id: "s1",
    category: "schedule",
    question: "How do I configure my weekly working hours and breaks?",
    answer:
      "Visit the Schedule tab (/doctor/schedule). For each day (Monday through Sunday), specify your shift start time, shift end time, and optional break period (such as lunch between 13:00 and 14:00). Ensure break times fall strictly within working hours.",
  },
  {
    id: "sl1",
    category: "slots",
    question: "How do appointment slots get generated for patients?",
    answer:
      "In the Appointment Slots tab (/doctor/slots), select a date range. MediSphere will automatically compute 30-minute consultation slots based on your active schedule, skipping configured break periods and existing bookings.",
  },
  {
    id: "v1",
    category: "visits",
    question: "When should I mark an appointment as 'Completed' or 'No-Show'?",
    answer:
      "After the patient's appointment time has passed or the physical consultation is concluded, open the Appointments tab (/doctor/appointments). Select the patient visit and click 'Mark Completed' or 'Mark No-Show'.",
  },
  {
    id: "v2",
    category: "visits",
    question: "Why does MediSphere prevent marking future visits as completed?",
    answer:
      "To preserve healthcare data integrity and prevent premature review fraud, appointments scheduled for future dates or times cannot be marked as completed in Asia/Kolkata timezone until the consultation has genuinely occurred.",
  },
  {
    id: "r1",
    category: "reviews",
    question: "Can anyone leave a fake review on my profile?",
    answer:
      "No. MediSphere strictly enforces verified reviews via database constraints. Only authenticated patients who have attended and completed a real appointment with your doctor profile can submit a review. Direct review creation without a completed appointment is rejected.",
  },
  {
    id: "vf1",
    category: "verification",
    question: "How is practitioner verification handled?",
    answer:
      "Clinical verification is strictly authorized by MediSphere administrative review upon submission of medical registration credentials (MCI / State Medical Council). Doctors cannot self-modify verification status, ensuring high trust for patients in Bhopal.",
  },
];

export default function DoctorHelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "schedule" | "slots" | "visits" | "verification" | "reviews">("all");
  const [expandedId, setExpandedId] = useState<string | null>("s1");

  const filteredFaqs = useMemo(() => {
    return DOCTOR_FAQS.filter((faq) => {
      const matchesCat = activeCategory === "all" || faq.category === activeCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        term.length === 0 ||
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  return (
    <ProtectedRoute allowedRoles={["doctor"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <DoctorDashboardNav />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              Doctor Portal Help Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Practitioner Guidance & Protocol
            </h1>
            <p className="text-sm text-slate-400">
              Learn how to manage your practice schedule, generate consultation slots, update visit statuses, and manage verified patient reviews.
            </p>

            {/* Search Input */}
            <div className="pt-2 relative max-w-md mx-auto">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search practitioner FAQs (e.g. schedule, slots, reviews)..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center flex-wrap gap-2 border-b border-slate-800 pb-4">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "all"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              All Topics
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("schedule")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "schedule"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Schedule Setup
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("slots")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "slots"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Slots Generator
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("visits")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "visits"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Managing Visits
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("reviews")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "reviews"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Patient Reviews
            </button>
          </div>

          {/* Accordion List */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
                <p className="text-sm font-semibold text-slate-300">No practitioner help articles found.</p>
                <p className="text-xs text-slate-500 mt-1">Try another keyword or select another category above.</p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = expandedId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : faq.id)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850 transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-bold text-slate-100 leading-snug">
                        {faq.question}
                      </span>
                      <div className={`h-6 w-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 transition-transform ${isOpen ? "rotate-180 bg-teal-950 text-teal-400" : "text-slate-400"}`}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Doctor Portal Action Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <Link
              href="/doctor/schedule"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-teal-950 text-teal-400 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">
                  Weekly Schedule
                </h4>
              </div>
              <p className="text-xs text-slate-400">Configure recurring weekly availability by day of the week.</p>
            </Link>

            <Link
              href="/doctor/slots"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-teal-950 text-teal-400 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">
                  Appointment Slots
                </h4>
              </div>
              <p className="text-xs text-slate-400">Generate 30-minute booking slots across custom calendar dates.</p>
            </Link>

            <Link
              href="/doctor/appointments"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-teal-950 text-teal-400 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">
                  Manage Visits
                </h4>
              </div>
              <p className="text-xs text-slate-400">Review patient visits and mark visits as Completed or No-Show.</p>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
