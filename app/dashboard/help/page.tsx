"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PatientDashboardNav from "@/components/dashboard/PatientDashboardNav";

interface FaqItem {
  id: string;
  category: "booking" | "reviews" | "locations" | "account";
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "b1",
    category: "booking",
    question: "How do I book an appointment with a verified doctor?",
    answer:
      "Navigate to the 'Find Doctors' page or explore specific specialities. Choose a verified practitioner, select an available date and 30-minute time slot, optionally provide a visit reason, and confirm your booking. Your slot is locked instantly via our atomic database protection.",
  },
  {
    id: "b2",
    category: "booking",
    question: "Will I receive a confirmation email when I book?",
    answer:
      "Yes! Upon successful booking, a transactional confirmation email is sent via Resend directly to your registered email address, containing your appointment date, time in Asia/Kolkata timezone, doctor details, and clinic address.",
  },
  {
    id: "b3",
    category: "booking",
    question: "Why was a slot no longer available when I clicked to book?",
    answer:
      "MediSphere uses strict PostgreSQL row-level locking (FOR UPDATE) to prevent double-booking. If another patient completes a reservation on that specific slot first, the system safely protects against conflicts and prompts you to select another available time.",
  },
  {
    id: "r1",
    category: "reviews",
    question: "When can I submit a review for my doctor?",
    answer:
      "You are eligible to leave a verified rating and review once your doctor marks the appointment as 'Completed' after your visit. Cancelled, no-show, or upcoming appointments cannot be reviewed, ensuring 100% authentic patient feedback.",
  },
  {
    id: "r2",
    category: "reviews",
    question: "Are reviews public and privacy-protected?",
    answer:
      "Yes. MediSphere's public reviews projection displays your verified rating and written feedback while strictly concealing your phone number, email, and private appointment notes to safeguard patient privacy.",
  },
  {
    id: "l1",
    category: "locations",
    question: "Which clinics and hospitals are covered in Bhopal?",
    answer:
      "MediSphere features verified healthcare centers across Bhopal, including Bansal Hospital (Shahpura), Apollo Sage Hospitals (Bawadiya Kalan), AIIMS Bhopal (Saket Nagar), and specialized private clinics.",
  },
  {
    id: "l2",
    category: "locations",
    question: "How does the distance calculation work?",
    answer:
      "If you allow location access in your browser or search by Bhopal locality, MediSphere calculates accurate geodesic distance (Haversine formula in kilometers) between your coordinates and the clinic.",
  },
  {
    id: "a1",
    category: "account",
    question: "How do I update my name, phone number, or city?",
    answer:
      "Go to Account Settings (/dashboard/settings). Enter your updated details and click 'Save Profile Details'. Your changes will instantly sync across your active session and future appointment bookings.",
  },
  {
    id: "a2",
    category: "account",
    question: "Can I change my account role from patient to doctor?",
    answer:
      "No. To maintain patient safety and medical licensing compliance, roles are enforced via database constraints and Row Level Security. Healthcare practitioners must be verified through the doctor onboarding portal.",
  },
];

export default function PatientHelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "booking" | "reviews" | "locations" | "account">("all");
  const [expandedId, setExpandedId] = useState<string | null>("b1");

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
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
    <ProtectedRoute allowedRoles={["patient"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <PatientDashboardNav />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
              Patient Help & Support
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              How can we help you today?
            </h1>
            <p className="text-sm text-slate-600">
              Find answers to common questions about doctor bookings, appointment confirmations, reviews, and account settings in Bhopal.
            </p>

            {/* Search Input */}
            <div className="pt-2 relative max-w-md mx-auto">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search FAQs (e.g. confirmation, reviews, slot)..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 bg-white shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors text-slate-900"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center flex-wrap gap-2 border-b border-slate-200 pb-4">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "all"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Topics
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("booking")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "booking"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Booking & Slots
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("reviews")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "reviews"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Doctor Reviews
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("locations")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "locations"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Bhopal Clinics
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("account")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeCategory === "account"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Account & Profile
            </button>
          </div>

          {/* Accordion FAQ Items */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
                <p className="text-sm font-semibold text-slate-700">No help articles match your search.</p>
                <p className="text-xs text-slate-500 mt-1">Try different search keywords or select another topic.</p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = expandedId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : faq.id)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-bold text-slate-900 leading-snug">
                        {faq.question}
                      </span>
                      <div className={`h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 transition-transform ${isOpen ? "rotate-180 bg-teal-50 text-teal-600" : "text-slate-400"}`}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/40">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Emergency Notice & Contact Support */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <svg className="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Medical Emergency Disclaimer</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                MediSphere is an appointment booking platform and does not provide emergency triage. In case of an acute medical crisis, please call <strong>108</strong> (Ambulance) or proceed to the nearest emergency trauma center immediately.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-6 space-y-3">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>MediSphere Patient Desk</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Have a question regarding your account or booking confirmation? Our support team in Bhopal is here to assist.
              </p>
              <div className="pt-1">
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
                >
                  <span>Review Account & Notification Settings</span>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
