"use client";

import React from "react";
import StarRating from "./StarRating";
import type { PublicDoctorReview, DoctorRatingStats } from "@/types";

interface DoctorReviewsListProps {
  reviews: PublicDoctorReview[];
  stats: DoctorRatingStats;
  theme?: "light" | "dark";
  title?: string;
  emptyMessage?: string;
}

export default function DoctorReviewsList({
  reviews,
  stats,
  theme = "light",
  title = "Patient Reviews & Ratings",
  emptyMessage = "No patient reviews yet.",
}: DoctorReviewsListProps) {
  const isDark = theme === "dark";

  const containerBg = isDark
    ? "bg-slate-800/80 border-slate-700/80 text-white"
    : "bg-white border-slate-200 text-slate-900";

  const cardBg = isDark
    ? "bg-slate-900/60 border-slate-700/60"
    : "bg-slate-50/70 border-slate-200/70";

  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const primaryText = isDark ? "text-white" : "text-slate-900";
  const bodyText = isDark ? "text-slate-300" : "text-slate-700";

  const totalReviews = stats.totalReviews;
  const hasReviews = totalReviews > 0 && stats.averageRating !== null;

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 shadow-2xs space-y-6 ${containerBg}`}>
      {/* Header with Title and Verified Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isDark
                  ? "bg-teal-950 text-teal-300 border border-teal-800"
                  : "bg-teal-50 text-teal-700 border border-teal-200"
              }`}
            >
              ✓ Verified MediSphere Consultations
            </span>
            <span className={`text-xs ${secondaryText}`}>
              Authentic Patient Feedback
            </span>
          </div>
          <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${primaryText}`}>
            {title}
          </h2>
        </div>

        {hasReviews && (
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${primaryText}`}>
              {stats.averageRating?.toFixed(1)}
            </span>
            <span className={`text-sm ${secondaryText}`}>/ 5.0</span>
            <span className={`text-xs ${secondaryText} ml-1`}>
              ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}
      </div>

      {/* No Reviews State */}
      {!hasReviews ? (
        <div className="py-10 text-center space-y-3">
          <div
            className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center ${
              isDark ? "bg-slate-700/50 text-slate-400" : "bg-slate-100 text-slate-400"
            }`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <h3 className={`text-base font-bold ${primaryText}`}>
            {emptyMessage}
          </h3>
          <p className={`text-xs sm:text-sm ${secondaryText} max-w-md mx-auto leading-relaxed`}>
            Reviews can only be submitted by patients following completed MediSphere appointments. MediSphere never fabricates ratings or imports external directories.
          </p>
        </div>
      ) : (
        /* Reviews Content & Rating Breakdown */
        <div className="space-y-6">
          {/* Summary Breakdown Grid */}
          <div className={`rounded-2xl border p-5 sm:p-6 ${cardBg}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Overall Score Spotlight */}
              <div className="text-center md:border-r md:border-slate-200/50 md:pr-6 space-y-1">
                <span className={`text-4xl sm:text-5xl font-black ${primaryText}`}>
                  {stats.averageRating?.toFixed(1)}
                </span>
                <div className="flex justify-center mt-2">
                  <StarRating value={Math.round(stats.averageRating || 0)} readOnly size="md" />
                </div>
                <p className={`text-xs font-semibold ${secondaryText} mt-1`}>
                  Based on {totalReviews} verified {totalReviews === 1 ? "review" : "reviews"}
                </p>
              </div>

              {/* Rating Bars Distribution */}
              <div className="md:col-span-2 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star as keyof typeof stats.distribution] || 0;
                  const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className={`w-12 font-medium shrink-0 ${secondaryText}`}>
                        {star} {star === 1 ? "star" : "stars"}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`w-8 text-right font-mono text-[11px] ${secondaryText}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* List of Published Reviews */}
          <div className="space-y-4">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${secondaryText}`}>
              Patient Feedback ({reviews.length})
            </h3>

            <div className="divide-y divide-slate-200/60">
              {reviews.map((rev) => {
                const dateStr = rev.created_at
                  ? new Date(rev.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recent";

                return (
                  <div key={rev.id} className="py-4 sm:py-5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {/* Reviewer Avatar Circle */}
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isDark
                              ? "bg-teal-950 text-teal-300 border border-teal-800"
                              : "bg-teal-100 text-teal-800 border border-teal-200"
                          }`}
                        >
                          {rev.patient_display_name ? rev.patient_display_name[0].toUpperCase() : "P"}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${primaryText}`}>
                              {rev.patient_display_name}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isDark
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              ✓ Verified Patient
                            </span>
                          </div>
                          <span className={`text-[11px] ${secondaryText}`}>
                            Consultation in Bhopal • {dateStr}
                          </span>
                        </div>
                      </div>

                      <div>
                        <StarRating value={rev.rating} readOnly size="sm" />
                      </div>
                    </div>

                    {rev.review_text && (
                      <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line pl-10.5 ${bodyText}`}>
                        {rev.review_text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
