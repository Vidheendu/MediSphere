"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import DoctorCard from "./DoctorCard";
import ClinicMap from "@/components/maps/ClinicMap";
import { searchVerifiedDoctors } from "@/lib/services/doctors";
import { getClinics } from "@/lib/services/clinics";
import { CANONICAL_SPECIALITIES } from "@/lib/services/specialities";
import { useUserLocation } from "@/lib/maps";
import type { DoctorWithDetails, Clinic } from "@/types";

export default function DoctorListingClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // URL query parameter is source of truth for speciality and clinic
  const selectedSpeciality = searchParams.get("speciality") || "all";
  const selectedClinic = searchParams.get("clinic") || "all";
  const initialQuery = searchParams.get("q") || "";

  // User location hook
  const {
    coordinates: userCoords,
    status: locationStatus,
    error: locationError,
    requestLocation,
    clearLocation,
    explanation: locationExplanation,
  } = useUserLocation();

  // State management
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [feeRange, setFeeRange] = useState<"all" | "under-500" | "500-1000" | "1000-plus">("all");
  const [sortBy, setSortBy] = useState<"relevance" | "distance" | "experience" | "fee_asc" | "fee_desc" | "name">("relevance");
  const [viewMode, setViewMode] = useState<"list" | "map" | "split">("list");

  const [doctors, setDoctors] = useState<DoctorWithDetails[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVerifiedCount, setTotalVerifiedCount] = useState<number | null>(null);

  // Load available clinics for filter dropdown and map
  useEffect(() => {
    let ignore = false;
    getClinics()
      .then((data) => {
        if (!ignore) {
          setClinics(data);
        }
      })
      .catch((err) => {
        console.error("[DoctorListingClient] Failed to load clinics:", err);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Main data fetching effect
  useEffect(() => {
    let isCancelled = false;

    const loadDoctors = async () => {
      try {
        const results = await searchVerifiedDoctors({
          search: searchTerm,
          specialitySlug: selectedSpeciality,
          city: selectedCity,
          clinicId: selectedClinic,
          userCoordinates: userCoords,
          feeRange: feeRange,
          sortBy: sortBy,
        });

        if (!isCancelled) {
          setDoctors(results);
          setError(null);
          setLoading(false);

          if (
            searchTerm.trim() === "" &&
            selectedSpeciality === "all" &&
            selectedCity === "all" &&
            selectedClinic === "all" &&
            feeRange === "all"
          ) {
            setTotalVerifiedCount(results.length);
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load verified doctors.";
          setError(msg);
          setLoading(false);
        }
      }
    };

    loadDoctors();

    return () => {
      isCancelled = true;
    };
  }, [searchTerm, selectedSpeciality, selectedCity, selectedClinic, userCoords, feeRange, sortBy]);

  // Initial baseline count check if not set
  useEffect(() => {
    let ignore = false;
    if (totalVerifiedCount === null) {
      searchVerifiedDoctors()
        .then((base) => {
          if (!ignore) {
            setTotalVerifiedCount(base.length);
          }
        })
        .catch(() => {
          if (!ignore) {
            setTotalVerifiedCount(0);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [totalVerifiedCount]);

  // Handle speciality tab selection with URL update
  const handleSelectSpeciality = (slug: string) => {
    setLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug === "all") {
        params.delete("speciality");
      } else {
        params.set("speciality", slug);
      }
      const newQuery = params.toString();
      router.replace(newQuery ? `/doctors?${newQuery}` : "/doctors", { scroll: false });
    });
  };

  // Handle clinic filter selection with URL update
  const handleSelectClinic = (clinicId: string) => {
    setLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (clinicId === "all") {
        params.delete("clinic");
      } else {
        params.set("clinic", clinicId);
      }
      const newQuery = params.toString();
      router.replace(newQuery ? `/doctors?${newQuery}` : "/doctors", { scroll: false });
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setLoading(true);
    setSearchTerm("");
    setSelectedCity("all");
    setFeeRange("all");
    setSortBy("relevance");
    clearLocation();
    startTransition(() => {
      router.replace("/doctors", { scroll: false });
    });
  };

  // Check which canonical speciality is currently selected
  const activeSpecialityObj = useMemo(() => {
    return CANONICAL_SPECIALITIES.find(
      (s) => s.slug === selectedSpeciality || s.name.toLowerCase() === selectedSpeciality
    );
  }, [selectedSpeciality]);

  // Check active clinic object
  const activeClinicObj = useMemo(() => {
    return clinics.find((c) => c.id === selectedClinic);
  }, [clinics, selectedClinic]);

  const isFilteringActive =
    searchTerm.trim() !== "" ||
    selectedSpeciality !== "all" ||
    selectedCity !== "all" ||
    selectedClinic !== "all" ||
    feeRange !== "all" ||
    userCoords !== null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified Medical Discovery</span>
              <span>•</span>
              <span>Bhopal & Central MP</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Verified Doctors & Clinics in Bhopal
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
              Find and consult licensed healthcare specialists across Bhopal. Browse clinics on the interactive map or discover verified doctors by speciality, locality, and clinical credentials.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: List / Map / Split */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="View as Doctor List"
              >
                <span>📋</span>
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "map"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="View Clinic Map"
              >
                <span>🗺️</span>
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "split"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Side-by-side Map and List"
              >
                <span>◫</span>
                <span>Split</span>
              </button>
            </div>

            <Link
              href="/specialities"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <span>Specialities</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Optional Location Info Banner (when location is requested or active) */}
      {userCoords && (
        <div className="mb-6 rounded-2xl bg-teal-50 border border-teal-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-teal-900">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="font-bold">Device Location Active:</span> Showing authentic distance to clinics in Bhopal.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sortBy !== "distance" && (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setSortBy("distance");
                }}
                className="font-semibold text-teal-700 hover:underline"
              >
                Sort by Distance →
              </button>
            )}
            <button
              type="button"
              onClick={clearLocation}
              className="text-slate-500 hover:text-slate-800 underline"
            >
              Clear Location
            </button>
          </div>
        </div>
      )}

      {/* Map View Area (in "map" view mode) */}
      {viewMode === "map" && (
        <div className="mb-8">
          <ClinicMap
            clinics={clinics}
            selectedClinicId={selectedClinic !== "all" ? selectedClinic : null}
            onSelectClinic={(c) => handleSelectClinic(c.id)}
            userLocation={userCoords}
            userLocationStatus={locationStatus}
            userLocationError={locationError}
            onRequestUserLocation={requestLocation}
            height="460px"
          />
        </div>
      )}

      {/* Search & Filter Bar Controls */}
      <section aria-label="Search and filter controls" className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs mb-8 space-y-5">
        {/* Row 1: Search Box, City, and Clinic Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          {/* Main Search Box */}
          <div className="md:col-span-6 relative">
            <label htmlFor="doctor-search" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Search Doctors
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="doctor-search"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setLoading(true);
                  setSearchTerm(e.target.value);
                }}
                placeholder="Search by doctor name, speciality, clinic, or locality..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-hidden focus:ring-3 focus:ring-teal-500/15 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setSearchTerm("");
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search text"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* City / Locality Filter */}
          <div className="md:col-span-3">
            <label htmlFor="city-filter" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              City / Region
            </label>
            <select
              id="city-filter"
              value={selectedCity}
              onChange={(e) => {
                setLoading(true);
                setSelectedCity(e.target.value);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm text-slate-800 font-medium focus:bg-white focus:border-teal-500 focus:outline-hidden focus:ring-3 focus:ring-teal-500/15 transition-all"
            >
              <option value="all">All Bhopal & Central MP</option>
              <option value="bhopal">Bhopal (All)</option>
              <option value="shahpura">Shahpura</option>
              <option value="bawadiya">Bawadiya Kalan</option>
              <option value="saket nagar">Saket Nagar</option>
              <option value="mp nagar">MP Nagar</option>
              <option value="arera colony">Arera Colony</option>
              <option value="kolar">Kolar Road</option>
            </select>
          </div>

          {/* Clinic Filter */}
          <div className="md:col-span-3">
            <label htmlFor="clinic-filter" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Clinic / Hospital
            </label>
            <select
              id="clinic-filter"
              value={selectedClinic}
              onChange={(e) => handleSelectClinic(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm text-slate-800 font-medium focus:bg-white focus:border-teal-500 focus:outline-hidden focus:ring-3 focus:ring-teal-500/15 transition-all"
            >
              <option value="all">All Clinics & Hospitals</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Speciality Filter Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Filter by Speciality
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSelectSpeciality("all")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                selectedSpeciality === "all"
                  ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              All Specialities
            </button>
            {CANONICAL_SPECIALITIES.map((spec) => {
              const isSelected = selectedSpeciality.toLowerCase() === spec.slug.toLowerCase();
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => handleSelectSpeciality(spec.slug)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {spec.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Secondary Filters (Fee Filter, Sort, Distance Option, Location Button) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-slate-100 items-end">
          {/* Consultation Fee Filter */}
          <div>
            <label htmlFor="fee-filter" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Consultation Fee
            </label>
            <select
              id="fee-filter"
              value={feeRange}
              onChange={(e) => {
                setLoading(true);
                setFeeRange(e.target.value as typeof feeRange);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-hidden transition-all"
            >
              <option value="all">Any Fee Range</option>
              <option value="under-500">Under ₹500</option>
              <option value="500-1000">₹500 – ₹1000</option>
              <option value="1000-plus">₹1000 and above</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label htmlFor="sort-order" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sort By
            </label>
            <select
              id="sort-order"
              value={sortBy}
              onChange={(e) => {
                setLoading(true);
                setSortBy(e.target.value as typeof sortBy);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-hidden transition-all"
            >
              <option value="relevance">Default (Recent)</option>
              {userCoords && <option value="distance">Distance (Nearest First)</option>}
              <option value="experience">Experience (Highest First)</option>
              <option value="fee_asc">Consultation Fee (Low to High)</option>
              <option value="fee_desc">Consultation Fee (High to Low)</option>
              <option value="name">Doctor Name (A to Z)</option>
            </select>
          </div>

          {/* Location Request / Near Me Action */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Proximity Discovery
            </label>
            {userCoords ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 py-1.5 px-3 text-xs text-emerald-800">
                <span className="font-semibold flex items-center gap-1">
                  <span>📍</span>
                  <span>Near Me Active</span>
                </span>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-[11px] text-emerald-700 hover:text-emerald-950 underline"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationStatus === "requesting"}
                title={locationExplanation}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/60 py-2 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 hover:border-teal-300 transition-colors disabled:opacity-50"
              >
                <span>📍</span>
                <span>{locationStatus === "requesting" ? "Locating..." : "Find Doctors Near Me"}</span>
              </button>
            )}
          </div>

          {/* Quick Map View Toggle button */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Map View
            </label>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{viewMode === "map" ? "Show List View" : "Show Clinic Map"}</span>
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar & Clear All */}
        {isFilteringActive && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1">Active Filters:</span>

              {searchTerm.trim() && (
                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
                  <span>Search: &quot;{searchTerm}&quot;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setSearchTerm("");
                    }}
                    className="hover:text-teal-950 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedSpeciality !== "all" && (
                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
                  <span>Speciality: {activeSpecialityObj?.name || selectedSpeciality}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectSpeciality("all")}
                    className="hover:text-teal-950 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedCity !== "all" && (
                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
                  <span>Region: {selectedCity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setSelectedCity("all");
                    }}
                    className="hover:text-teal-950 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedClinic !== "all" && (
                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
                  <span>Clinic: {activeClinicObj?.name || "Selected Clinic"}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectClinic("all")}
                    className="hover:text-teal-950 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {userCoords && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                  <span>📍 Near Me</span>
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="hover:text-emerald-950 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {feeRange !== "all" && (
                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
                  <span>
                    Fee:{" "}
                    {feeRange === "under-500"
                      ? "Under ₹500"
                      : feeRange === "500-1000"
                      ? "₹500 - ₹1000"
                      : "₹1000+"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setFeeRange("all");
                    }}
                    className="hover:text-teal-950 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-2"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </section>

      {/* Main Content Layout (Responsive Split or Full Grid) */}
      <div className={viewMode === "split" ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" : ""}>
        {/* Left Column in Split Mode: Sticky Map */}
        {viewMode === "split" && (
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <ClinicMap
              clinics={clinics}
              selectedClinicId={selectedClinic !== "all" ? selectedClinic : null}
              onSelectClinic={(c) => handleSelectClinic(c.id)}
              userLocation={userCoords}
              userLocationStatus={locationStatus}
              userLocationError={locationError}
              onRequestUserLocation={requestLocation}
              height="520px"
            />
          </div>
        )}

        {/* Doctor Results Column */}
        <div className={viewMode === "split" ? "lg:col-span-7" : ""}>
          {/* Results Header: Count & Verification Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                {loading ? "Searching..." : `Verified Doctors (${doctors.length})`}
              </h2>
              {!loading && doctors.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ 100% Vetted
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Strictly showing verified practitioners in Bhopal
            </div>
          </div>

          {/* 1. Error State */}
          {error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-rose-900 shadow-2xs mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">Failed to Load Doctor Listings</h3>
                  <p className="text-xs text-rose-700 mt-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      searchVerifiedDoctors({
                        search: searchTerm,
                        specialitySlug: selectedSpeciality,
                        city: selectedCity,
                        clinicId: selectedClinic,
                        userCoordinates: userCoords,
                        feeRange: feeRange,
                        sortBy: sortBy,
                      }).then((res) => {
                        setDoctors(res);
                        setError(null);
                        setLoading(false);
                      }).catch((e) => {
                        setError(e instanceof Error ? e.message : "Retry failed");
                        setLoading(false);
                      });
                    }}
                    className="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    Retry Search
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Loading State: Skeleton Cards */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs animate-pulse flex flex-col justify-between h-56"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-40 bg-slate-200 rounded" />
                      <div className="h-3 w-28 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="h-3 w-56 bg-slate-100 rounded" />
                    <div className="h-3 w-44 bg-slate-100 rounded" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-8 w-24 bg-slate-200 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Empty States Handling */}
          {!loading && !error && doctors.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-14 text-center shadow-2xs max-w-2xl mx-auto my-6">
              {totalVerifiedCount === 0 || totalVerifiedCount === null ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-4 border border-teal-100">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    No verified doctors are currently available.
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    MediSphere strictly lists authenticated medical practitioners with verified credentials. Doctor accounts in Bhopal are currently queued for verification.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/specialities"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Browse Specialities
                    </Link>
                    <Link
                      href="/doctor/login"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs"
                    >
                      Doctor Registration Portal →
                    </Link>
                  </div>
                </>
              ) : selectedClinic !== "all" ? (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-4 border border-teal-100">
                    <span className="text-2xl">🏥</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    No verified doctors currently listed for {activeClinicObj?.name || "this clinic"}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Practitioners associated with this facility are currently undergoing verification.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectClinic("all")}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs"
                    >
                      Show All Clinics
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </>
              ) : searchTerm.trim().length > 0 ? (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-100">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    No verified doctors found matching &quot;{searchTerm}&quot;
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    We couldn&apos;t find any verified practitioners matching your search query. Check for typos or reset filters.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        setSearchTerm("");
                      }}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs"
                    >
                      Clear Search
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 mb-4">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    No doctors match your selected filters.
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Try widening your filters to view all available verified practitioners.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 4. Doctors Listing Grid */}
          {!loading && !error && doctors.length > 0 && (
            <div className={`grid gap-4 sm:gap-6 ${viewMode === "split" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
              {doctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trust & Verification Guarantee Footer Note */}
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              MediSphere Credential Guarantee
            </h4>
            <p className="text-xs text-slate-500">
              Zero placeholder or mock doctors. All listed profiles are verified with accredited regulatory boards in Madhya Pradesh.
            </p>
          </div>
        </div>

        <Link
          href="/#how-it-works"
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 shrink-0"
        >
          Verification Standards →
        </Link>
      </div>
    </div>
  );
}
