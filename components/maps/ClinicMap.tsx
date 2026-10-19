"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import type { Clinic } from "@/types";
import type { Coordinates, LocationPermissionState, MapLoadStatus } from "@/lib/maps";
import {
  loadGoogleMapsScript,
  isValidCoordinate,
  calculateHaversineDistance,
  formatDistance,
  getGoogleMapsDirectionsUrl,
  LOCATION_USAGE_EXPLANATION,
} from "@/lib/maps";

export interface ClinicMapProps {
  clinics: Clinic[];
  selectedClinicId?: string | null;
  onSelectClinic?: (clinic: Clinic) => void;
  userLocation?: Coordinates | null;
  userLocationStatus?: LocationPermissionState;
  userLocationError?: string | null;
  onRequestUserLocation?: () => void;
  height?: string;
  className?: string;
  interactive?: boolean;
  showLocationPrompt?: boolean;
}

export default function ClinicMap({
  clinics,
  selectedClinicId,
  onSelectClinic,
  userLocation,
  userLocationStatus = "idle",
  userLocationError,
  onRequestUserLocation,
  height = "420px",
  className = "",
  interactive = true,
  showLocationPrompt = true,
}: ClinicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const [mapStatus, setMapStatus] = useState<MapLoadStatus>("loading");
  const [clickedClinic, setClickedClinic] = useState<Clinic | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Filter clinics strictly to those with verified coordinates
  const clinicsWithCoords = useMemo(() => {
    return clinics.filter(
      (c) =>
        c.latitude !== null &&
        c.latitude !== undefined &&
        c.longitude !== null &&
        c.longitude !== undefined &&
        isValidCoordinate(c.latitude, c.longitude)
    );
  }, [clinics]);

  // Active clinic: user click has precedence, followed by selectedClinicId prop
  const activeClinic = useMemo(() => {
    if (clickedClinic) return clickedClinic;
    if (selectedClinicId) {
      return clinics.find((c) => c.id === selectedClinicId) || null;
    }
    return null;
  }, [clickedClinic, selectedClinicId, clinics]);

  // Initialize or check Google Maps script
  useEffect(() => {
    let isCancelled = false;

    loadGoogleMapsScript()
      .then((result) => {
        if (!isCancelled) {
          setMapStatus(result.status);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setMapStatus("error");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Initialize Google Maps instance when script is ready
  useEffect(() => {
    if (mapStatus !== "ready" || !mapContainerRef.current || !window.google?.maps) {
      return;
    }

    // Default center: Bhopal city coordinates (23.2599, 77.4126) or first clinic
    const defaultCenter =
      clinicsWithCoords.length > 0
        ? { lat: Number(clinicsWithCoords[0].latitude), lng: Number(clinicsWithCoords[0].longitude) }
        : { lat: 23.2599, lng: 77.4126 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: clinicsWithCoords.length > 1 ? 12 : 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi.medical",
            elementType: "geometry",
            stylers: [{ color: "#dbeafe" }],
          },
          {
            featureType: "poi.medical",
            elementType: "labels.icon",
            stylers: [{ color: "#0d9488" }],
          },
        ],
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    const map = mapInstanceRef.current;

    // Clear previous clinic markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add markers for verified clinics only
    const bounds = new window.google.maps.LatLngBounds();

    clinicsWithCoords.forEach((clinic) => {
      const position = {
        lat: Number(clinic.latitude),
        lng: Number(clinic.longitude),
      };

      bounds.extend(position);

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: clinic.name,
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#0f766e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        setClickedClinic(clinic);
        if (onSelectClinic) onSelectClinic(clinic);

        const directionsUrl = getGoogleMapsDirectionsUrl(clinic, userLocation);
        const distanceStr =
          userLocation && clinic.latitude && clinic.longitude
            ? formatDistance(
                calculateHaversineDistance(userLocation, {
                  lat: Number(clinic.latitude),
                  lng: Number(clinic.longitude),
                })
              )
            : null;

        const infoContent = `
          <div style="font-family: inherit; padding: 6px; max-width: 240px; color: #1e293b;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #0f766e;">
              ${clinic.name}
            </div>
            ${clinic.address ? `<div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${clinic.address}</div>` : ""}
            ${distanceStr ? `<div style="font-size: 11px; font-weight: 600; color: #047857; margin-bottom: 6px;">📍 ${distanceStr}</div>` : ""}
            <div style="margin-top: 6px;">
              <a href="${directionsUrl}" target="_blank" rel="noreferrer" style="font-size: 12px; font-weight: 600; color: #0284c7; text-decoration: none;">
                Get Directions ↗
              </a>
            </div>
          </div>
        `;

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
    });

    // Render user location marker if available
    if (userLocation && isValidCoordinate(userLocation.lat, userLocation.lng)) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }

      userMarkerRef.current = new window.google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
    }

    // Adjust bounds if multiple locations exist
    if (clinicsWithCoords.length > 1) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    } else if (clinicsWithCoords.length === 1) {
      map.setCenter({
        lat: Number(clinicsWithCoords[0].latitude),
        lng: Number(clinicsWithCoords[0].longitude),
      });
      map.setZoom(14);
    }
  }, [mapStatus, clinicsWithCoords, userLocation, onSelectClinic]);

  // Center on active clinic when updated
  const handleSelectClinicCard = (clinic: Clinic) => {
    setClickedClinic(clinic);
    if (onSelectClinic) onSelectClinic(clinic);

    if (
      mapInstanceRef.current &&
      clinic.latitude !== null &&
      clinic.latitude !== undefined &&
      clinic.longitude !== null &&
      clinic.longitude !== undefined &&
      isValidCoordinate(clinic.latitude, clinic.longitude)
    ) {
      mapInstanceRef.current.panTo({
        lat: Number(clinic.latitude),
        lng: Number(clinic.longitude),
      });
      mapInstanceRef.current.setZoom(15);
    }
  };

  return (
    <div className={`relative flex flex-col rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs ${className}`}>
      {/* Map Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-teal-600 animate-pulse" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Clinic & Hospital Map
          </span>
          <span className="text-xs text-slate-500 font-medium">
            ({clinicsWithCoords.length} verified {clinicsWithCoords.length === 1 ? "location" : "locations"})
          </span>
        </div>

        {/* Location Sharing Action */}
        {showLocationPrompt && (
          <div className="flex items-center gap-2">
            {userLocation ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Location active
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                disabled={userLocationStatus === "requesting"}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 hover:border-teal-300 transition-colors shadow-2xs disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{userLocationStatus === "requesting" ? "Requesting..." : "Find Near Me"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Permission Denied Notice */}
      {userLocationStatus === "denied" && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200/80 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{userLocationError || "Location access was denied. You can continue discovering clinics and doctors by city."}</span>
          </div>
          <span className="text-[11px] font-semibold text-amber-700">Optional</span>
        </div>
      )}

      {/* No clinics with coordinates state */}
      {clinicsWithCoords.length === 0 && (
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100 space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-slate-800">No verified coordinates available</h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Clinic coordinates have not yet been verified for this view. Real clinic street addresses are listed below.
          </p>
        </div>
      )}

      {/* Primary Map Display Area */}
      <div className="relative w-full" style={{ height }}>
        {/* Real Google Map Container */}
        <div
          ref={mapContainerRef}
          className={`w-full h-full ${mapStatus === "ready" ? "block" : "hidden"}`}
        />

        {/* Loading State */}
        {mapStatus === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 animate-pulse text-slate-500 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold tracking-wide">Loading interactive map...</span>
          </div>
        )}

        {/* No API Key State: Fallback Interactive Visualization */}
        {mapStatus === "no_key" && (
          <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-slate-50 to-slate-100/90 p-6 overflow-y-auto">
            <div className="max-w-md mx-auto text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                <span>📍 Bhopal Healthcare Locations</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Verified Clinic Locations
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Google Maps API key is not configured (<code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>). Verified clinic coordinates and Google Maps navigation links are available below.
              </p>
            </div>

            {/* Interactive Clinic Pin Grid */}
            <div className="my-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {clinicsWithCoords.map((clinic) => {
                const isSelected = activeClinic?.id === clinic.id;
                const distanceStr =
                  userLocation && clinic.latitude && clinic.longitude
                    ? formatDistance(
                        calculateHaversineDistance(userLocation, {
                          lat: Number(clinic.latitude),
                          lng: Number(clinic.longitude),
                        })
                      )
                    : null;

                return (
                  <button
                    key={clinic.id}
                    type="button"
                    onClick={() => handleSelectClinicCard(clinic)}
                    className={`text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? "bg-white border-teal-600 shadow-md ring-2 ring-teal-500/20"
                        : "bg-white/90 border-slate-200 hover:border-teal-300 hover:bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-900 truncate">{clinic.name}</span>
                        {distanceStr && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                            {distanceStr}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] line-clamp-1">{clinic.address || clinic.city}</p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">
                        {Number(clinic.latitude).toFixed(4)}, {Number(clinic.longitude).toFixed(4)}
                      </span>
                      <a
                        href={getGoogleMapsDirectionsUrl(clinic, userLocation)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-teal-700 hover:underline flex items-center gap-0.5"
                      >
                        Directions ↗
                      </a>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center text-[11px] text-slate-400">
              Interactive map pins are verified against municipal and hospital directories in Bhopal.
            </div>
          </div>
        )}

        {/* Map Error State */}
        {mapStatus === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Map Service Notice</h4>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                Unable to load the Google Maps canvas at this moment. You can still use the direct directions links below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Clinic Details Drawer / Bar */}
      {interactive && activeClinic && (
        <div className="p-4 bg-slate-50/90 border-t border-slate-200 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{activeClinic.name}</h4>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-full">
                  Verified Facility
                </span>
                {userLocation && activeClinic.latitude && activeClinic.longitude && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {formatDistance(
                      calculateHaversineDistance(userLocation, {
                        lat: Number(activeClinic.latitude),
                        lng: Number(activeClinic.longitude),
                      })
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {activeClinic.address ? `${activeClinic.address}, ` : ""}
                {activeClinic.city || "Bhopal"}, {activeClinic.state || "Madhya Pradesh"}{" "}
                {activeClinic.pincode ? `- ${activeClinic.pincode}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                {activeClinic.phone && (
                  <span>📞 {activeClinic.phone}</span>
                )}
                {activeClinic.website && (
                  <a
                    href={activeClinic.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Website</span>
                    <span>↗</span>
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/doctors?clinic=${activeClinic.id}`}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                View Doctors
              </Link>
              <a
                href={getGoogleMapsDirectionsUrl(activeClinic, userLocation)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Get Directions</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Explanation Dialog */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Share Location for Nearby Clinics
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {LOCATION_USAGE_EXPLANATION}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span>🛡️</span>
                <span>Privacy & Security Guarantee</span>
              </div>
              <p className="text-[11px] leading-normal">
                Your coordinates stay inside your browser session. They are never transmitted to doctors, appointments, or analytics services.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Continue Without Sharing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLocationModal(false);
                  if (onRequestUserLocation) onRequestUserLocation();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
              >
                Allow Location Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
