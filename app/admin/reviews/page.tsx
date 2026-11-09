"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminReviews, deleteAdminReview, type AdminReviewItem } from "@/lib/services/admin";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadReviews = useCallback(async (rating: string, search: string) => {
    try {
      setLoading(true);
      const minR = rating !== "all" ? parseInt(rating) : undefined;
      const maxR = rating !== "all" ? parseInt(rating) : undefined;
      const data = await getAdminReviews({
        minRating: minR,
        maxRating: maxR,
        search,
      });
      setReviews(data);
    } catch (err) {
      console.error("[AdminReviewsPage] Error:", err);
      setFeedback({ text: "Failed to load review records.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        const minR = ratingFilter !== "all" ? parseInt(ratingFilter) : undefined;
        const maxR = ratingFilter !== "all" ? parseInt(ratingFilter) : undefined;
        const data = await getAdminReviews({
          minRating: minR,
          maxRating: maxR,
          search: searchQuery,
        });
        if (!ignore) {
          setReviews(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("[AdminReviewsPage] Initial load error:", err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      ignore = true;
    };
  }, [ratingFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReviews(ratingFilter, searchQuery);
  };

  const handleDeleteReview = async (review: AdminReviewItem) => {
    const confirmed = window.confirm(
      `Delete review by "${review.patient_name}" for Dr. ${review.doctor_name}? This action is permanent.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(review.id);
      setFeedback(null);
      const res = await deleteAdminReview(review.id);

      if (res.success) {
        setFeedback({ text: "Review removed from platform by administrator.", type: "success" });
        await loadReviews(ratingFilter, searchQuery);
      } else {
        setFeedback({ text: res.error || "Failed to remove review.", type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting review.";
      setFeedback({ text: msg, type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Moderation Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit patient reviews submitted for completed consultations. Enforce authentic patient feedback standards.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-auto"
        >
          ← Back to Overview
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Controls & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Rating Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "5", "4", "3", "2", "1"] as const).map((r) => {
            const active = ratingFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {r === "all" ? "All Stars" : `★ ${r}`}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search doctor, patient, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <p className="font-semibold text-slate-800">No reviews found</p>
            <p className="text-xs text-slate-500 mt-1">There are no patient reviews matching the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-3">Practitioner</th>
                  <th className="py-3 px-3">Patient & Appointment</th>
                  <th className="py-3 px-3">Review Feedback</th>
                  <th className="py-3 px-3">Date (IST)</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reviews.map((rev) => {
                  return (
                    <tr key={rev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
                          <span>{rev.rating}</span>
                          <span>★</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-900">Dr. {rev.doctor_name}</p>
                        <p className="text-[11px] text-slate-500">{rev.doctor_speciality}</p>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-medium text-slate-800">{rev.patient_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Appt: {rev.appointment_id.slice(0, 8)}...
                        </p>
                      </td>

                      <td className="py-3.5 px-3 max-w-sm">
                        <p className="text-slate-700 text-xs line-clamp-2">
                          {rev.review_text || <span className="text-slate-400 italic">No written comment</span>}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(rev.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteReview(rev)}
                          disabled={deletingId === rev.id}
                          className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors disabled:opacity-50"
                        >
                          {deletingId === rev.id ? "Deleting..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
        <strong>Integrity Notice:</strong> Reviews can only be submitted by verified patients who attended a completed appointment.
        Doctors cannot edit, forge, or alter patient reviews.
      </div>
    </div>
  );
}

