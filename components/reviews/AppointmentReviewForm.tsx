"use client";

import React, { useState } from "react";
import StarRating from "./StarRating";
import {
  submitReview,
  MAX_REVIEW_TEXT_LENGTH,
  formatReviewError,
} from "@/lib/services/reviews";
import type { AppointmentWithDetails, DoctorReview } from "@/types";

interface AppointmentReviewFormProps {
  appointment: AppointmentWithDetails;
  initialReview?: DoctorReview | null;
  onReviewSubmitted?: (review: DoctorReview) => void;
}

export default function AppointmentReviewForm({
  appointment,
  initialReview = null,
  onReviewSubmitted,
}: AppointmentReviewFormProps) {
  const [existingReview, setExistingReview] = useState<DoctorReview | null>(initialReview);
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isCompleted = appointment.status === "completed";
  const doctorName = appointment.doctor?.profile?.full_name?.toLowerCase().startsWith("dr.")
    ? appointment.doctor?.profile?.full_name
    : `Dr. ${appointment.doctor?.profile?.full_name || "Verified Practitioner"}`;

  // 1. If existing review already exists, render the Already-Reviewed Card
  if (existingReview) {
    const formattedDate = existingReview.created_at
      ? new Date(existingReview.created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Recently";

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Consultation Reviewed
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Submitted on {formattedDate}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Your Feedback for {doctorName}
            </h3>
          </div>

          <div>
            <StarRating value={existingReview.rating} readOnly size="md" showText />
          </div>
        </div>

        {existingReview.review_text ? (
          <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-4">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              &ldquo;{existingReview.review_text}&rdquo;
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            You provided a {existingReview.rating}-star rating without additional comments.
          </p>
        )}

        <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            Thank you for your feedback. Your review helps other patients in Bhopal find verified medical care.
          </span>
        </div>
      </div>
    );
  }

  // 2. If appointment is NOT completed, display status-specific explanation
  if (!isCompleted) {
    let explanation = "Reviews can only be submitted after your consultation has been completed.";
    let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";

    if (appointment.status === "confirmed") {
      explanation = "Your consultation is scheduled. You will be able to submit a rating and review once the doctor marks this visit as completed.";
      badgeColor = "bg-teal-50 text-teal-700 border-teal-200";
    } else if (appointment.status === "cancelled") {
      explanation = "This consultation was cancelled. Cancelled appointments cannot receive reviews.";
      badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (appointment.status === "no_show") {
      explanation = "This consultation was recorded as a no-show. Only completed consultations are eligible for patient reviews.";
      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Doctor Rating & Review</h3>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
            Status: {appointment.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {explanation}
        </p>
      </div>
    );
  }

  // 3. Appointment is COMPLETED: Render interactive review form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (rating < 1 || rating > 5) {
      setErrorMessage("Please select a star rating from 1 to 5 before submitting.");
      return;
    }

    if (reviewText.length > MAX_REVIEW_TEXT_LENGTH) {
      setErrorMessage(`Review text cannot exceed ${MAX_REVIEW_TEXT_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitReview({
        appointmentId: appointment.id,
        rating,
        reviewText: reviewText.trim() || null,
      });

      if (!res.success || !res.review) {
        const formatted = formatReviewError(res.error || "Failed to submit review.");
        setErrorMessage(formatted.message);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Your review has been successfully submitted! Thank you.");
      setExistingReview(res.review);
      if (onReviewSubmitted) {
        onReviewSubmitted(res.review);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const formatted = formatReviewError(raw);
      setErrorMessage(formatted.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const charactersRemaining = MAX_REVIEW_TEXT_LENGTH - reviewText.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Completed Visit
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Verified MediSphere Consultation
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Review Your Consultation with {doctorName}
        </h3>
        <p className="text-xs text-slate-600 mt-1">
          Share your feedback regarding your appointment, clinic experience, and doctor care to help other patients make informed healthcare decisions.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
          <svg className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <span className="font-semibold">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-800 flex items-start gap-2.5">
          <svg className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">
            <span className="font-semibold">{successMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Rating Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Overall Consultation Rating <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <StarRating
              value={rating}
              onChange={(newRating) => setRating(newRating)}
              size="lg"
              showText
            />
          </div>
          {rating === 0 && (
            <p className="text-[11px] text-slate-500 mt-1">
              Click on a star to select a rating from 1 to 5.
            </p>
          )}
        </div>

        {/* Optional Review Text */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="review-text"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Consultation Feedback <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <span
              className={`text-[11px] font-mono ${
                charactersRemaining < 50 ? "text-amber-600 font-bold" : "text-slate-400"
              }`}
            >
              {reviewText.length} / {MAX_REVIEW_TEXT_LENGTH}
            </span>
          </div>

          <textarea
            id="review-text"
            rows={4}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            maxLength={MAX_REVIEW_TEXT_LENGTH}
            placeholder="Share details of your consultation experience: wait time, practitioner attentiveness, clinic cleanliness, or explanations provided..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 transition-all resize-y"
          />

          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            Please do not include private medical records, payment details, or personal contact numbers in your review.
          </p>
        </div>

        {/* Privacy Note */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
          <svg className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <span className="font-semibold text-slate-800">Patient Privacy Protected: </span>
            Reviews are publicly displayed on {doctorName}&apos;s profile with your first name or &ldquo;Verified Patient&rdquo;. Your email address, phone number, and private consultation notes are never revealed.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting Review...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Submit Verified Review</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
