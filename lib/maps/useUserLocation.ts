"use client";

import { useState, useCallback } from "react";
import type { Coordinates, LocationPermissionState } from "./types";
import { isValidCoordinate } from "./utils";

export interface UseUserLocationResult {
  coordinates: Coordinates | null;
  status: LocationPermissionState;
  error: string | null;
  requestLocation: () => void;
  clearLocation: () => void;
  explanation: string;
}

export const LOCATION_USAGE_EXPLANATION =
  "Your location is used only in your browser to calculate distances to nearby clinics in Bhopal. Your coordinates are never saved to our database or sent to third-party services.";

/**
 * Hook for optional patient location sharing.
 * Strictly adheres to MediSphere privacy & security principles:
 * - Does NOT request permission automatically on page load.
 * - Stores coordinates ONLY in client-side component state during active session.
 * - Gracefully handles denial without impeding other features.
 */
export function useUserLocation(): UseUserLocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationPermissionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("Geolocation is not supported by your current browser.");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (isValidCoordinate(lat, lng)) {
          setCoordinates({ lat, lng });
          setStatus("granted");
          setError(null);
        } else {
          setStatus("denied");
          setError("Received invalid geographic coordinates from browser.");
        }
      },
      (geoError) => {
        setCoordinates(null);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setStatus("denied");
            setError(
              "Location permission was denied. You can continue discovering clinics and doctors by city or speciality."
            );
            break;
          case geoError.POSITION_UNAVAILABLE:
            setStatus("denied");
            setError("Location information is currently unavailable from your device.");
            break;
          case geoError.TIMEOUT:
            setStatus("denied");
            setError("Location request timed out. Please try again or use city filters.");
            break;
          default:
            setStatus("denied");
            setError("An unknown error occurred while retrieving your location.");
            break;
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setCoordinates(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    coordinates,
    status,
    error,
    requestLocation,
    clearLocation,
    explanation: LOCATION_USAGE_EXPLANATION,
  };
}
