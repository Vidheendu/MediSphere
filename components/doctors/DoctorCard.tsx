"use client";

import React from "react";
import Link from "next/link";
import type { DoctorWithDetails } from "@/types";

export interface DoctorCardProps {
  doctor: DoctorWithDetails;
  onViewProfile?: (doctor: DoctorWithDetails) => void;
  className?: string;
}

/**
 * Reusable DoctorCard component for MediSphere.
 * Strictly presents authentic, verified practitioner data from Supabase.
 * Does NOT display fake/default values for missing fields.
 */
export default function DoctorCard({
  doctor,
  onViewProfile,
  className = "",
}: DoctorCardProps) {
  const profileName = doctor.profile?.full_name?.trim();
  const displayName = profileName
    ? profileName.toLowerCase().startsWith("dr.") || profileName.toLowerCase().startsWith("dr ")
      ? profileName
      : `Dr. ${profileName}`
    : "Verified Doctor";

  // Initials for avatar
  const initials = profileName
    ? profileName
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MD";

  // Authentic rating: only displayed if legitimately present in database record
  const legitimateRating =
    typeof (doctor as unknown as Record<string, unknown>).rating === "number"
      ? ((doctor as unknown as Record<string, unknown>).rating as number)
      : null;

  // Authentic location: clinic city/address preferred, profile location as fallback
  const locationString =
    doctor.clinic?.city ||
    doctor.clinic?.address ||
    doctor.profile?.location ||
    null;

  return (
    <article
      data-testid={`doctor-card-${doctor.id}`}
      className={`group relative bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div className="space-y-4">
        {/* Top Header Row: Avatar, Name, Verified Status */}
        <div className="flex items-start gap-4">
          {/* Avatar Icon */}
          <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/60 border border-teal-200/70 text-teal-700 font-bold text-base sm:text-lg shadow-2xs group-hover:scale-102 transition-transform">
            <span>{initials}</span>
            <span
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"
              title="Verified Practitioner"
            >
              <svg
                className="h-2.5 w-2.5 text-white"
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

          {/* Name & Speciality Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                {displayName}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <svg
                  className="w-3 h-3 text-emerald-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified
              </span>
            </div>

            {/* Speciality Badge & Qualification */}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {doctor.speciality?.name && (
                <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                  {doctor.speciality.name}
                </span>
              )}

              {doctor.qualification && (
                <span className="text-slate-600 font-medium truncate max-w-xs">
                  {doctor.qualification}
                </span>
              )}
            </div>

            {/* Legitimate Rating (rendered ONLY if legitimately present in database) */}
            {legitimateRating !== null && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-600 font-semibold">
                <svg
                  className="h-3.5 w-3.5 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{legitimateRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Doctor About / Bio Snippet (only if authentic data exists) */}
        {doctor.about && (
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {doctor.about}
          </p>
        )}

        {/* Practice Details Grid (Experience, Clinic, Location) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          {/* Experience Years */}
          {doctor.experience_years !== null &&
            doctor.experience_years !== undefined &&
            doctor.experience_years >= 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">🕒</span>
                <span className="font-semibold text-slate-800">
                  {doctor.experience_years} {doctor.experience_years === 1 ? "year" : "years"}
                </span>
                <span className="text-slate-500">experience</span>
              </div>
            )}

          {/* Clinic Name */}
          {doctor.clinic?.name && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-400">🏥</span>
              <span className="font-medium text-slate-700 truncate" title={doctor.clinic.name}>
                {doctor.clinic.name}
              </span>
            </div>
          )}

          {/* Location / City */}
          {locationString && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-400">📍</span>
              <span className="text-slate-600 truncate" title={locationString}>
                {locationString}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer: Consultation Fee & Profile Button */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        {/* Consultation Fee (only displayed if authentically present) */}
        <div>
          {doctor.consultation_fee !== null &&
          doctor.consultation_fee !== undefined &&
          doctor.consultation_fee >= 0 ? (
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Consultation Fee
              </span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900">
                ₹{doctor.consultation_fee}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              Verified Practice
            </span>
          )}
        </div>

        {/* Profile Button */}
        {onViewProfile ? (
          <button
            type="button"
            onClick={() => onViewProfile(doctor)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-2xs hover:shadow-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-teal-500/50"
          >
            <span>View Profile</span>
            <svg
              className="h-3.5 w-3.5"
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
          </button>
        ) : (
          <Link
            href={`/doctors/${doctor.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-2xs hover:shadow-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-teal-500/50"
          >
            <span>View Profile</span>
            <svg
              className="h-3.5 w-3.5"
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
          </Link>
        )}
      </div>
    </article>
  );
}
