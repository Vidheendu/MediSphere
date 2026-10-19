import type { MapLoadStatus } from "./types";

declare global {
  interface Window {
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    _googleMapsInitPromise?: Promise<GoogleMapsLoadResult>;
  }
}

export interface GoogleMapsLoadResult {
  status: MapLoadStatus;
  google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  errorMessage?: string;
}

const SCRIPT_ID = "medisphere-google-maps-script";

/**
 * Safely loads the Google Maps JavaScript API via dynamic script injection.
 * Handles missing API key, existing window.google instances, and network errors gracefully.
 */
export function loadGoogleMapsScript(): Promise<GoogleMapsLoadResult> {
  // If running on server, return loading status
  if (typeof window === "undefined") {
    return Promise.resolve({ status: "loading" });
  }

  // If already loaded on window, return ready
  if (window.google?.maps) {
    return Promise.resolve({ status: "ready", google: window.google });
  }

  // If a load is already in-flight, return the existing Promise
  if (window._googleMapsInitPromise) {
    return window._googleMapsInitPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  // If no API key is provided, gracefully report no_key status
  if (!apiKey) {
    return Promise.resolve({
      status: "no_key",
      errorMessage:
        "Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.",
    });
  }

  window._googleMapsInitPromise = new Promise<GoogleMapsLoadResult>((resolve) => {
    // Check if script tag is already in DOM
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.type = "text/javascript";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleSuccess = () => {
      if (window.google?.maps) {
        resolve({ status: "ready", google: window.google });
      } else {
        // Short poll if script fired load before google.maps completed initialization
        const checkInterval = window.setInterval(() => {
          if (window.google?.maps) {
            window.clearInterval(checkInterval);
            resolve({ status: "ready", google: window.google });
          }
        }, 50);

        window.setTimeout(() => {
          window.clearInterval(checkInterval);
          if (window.google?.maps) {
            resolve({ status: "ready", google: window.google });
          } else {
            resolve({
              status: "error",
              errorMessage: "Google Maps script loaded but map runtime was not initialized.",
            });
          }
        }, 3000);
      }
    };

    const handleError = () => {
      resolve({
        status: "error",
        errorMessage:
          "Failed to load Google Maps script. Please check your internet connection or API key restriction.",
      });
    };

    script.addEventListener("load", handleSuccess);
    script.addEventListener("error", handleError);
  });

  return window._googleMapsInitPromise;
}
