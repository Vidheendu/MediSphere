import type { Coordinates } from "./types";
import type { Clinic } from "@/types";

/**
 * Validates whether latitude and longitude are valid numeric geographic coordinates.
 * Strictly prevents NaN, undefined, null, or out-of-range coordinates.
 */
export function isValidCoordinate(
  lat: unknown,
  lng: unknown
): lat is number {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Calculates great-circle distance between two points on Earth using the Haversine formula.
 * Returns distance in kilometers (rounded to 1 decimal place), or null if coordinates are invalid.
 */
export function calculateHaversineDistance(
  coord1: { lat: number; lng: number } | null | undefined,
  coord2: { lat: number; lng: number } | null | undefined
): number | null {
  if (
    !coord1 ||
    !coord2 ||
    !isValidCoordinate(coord1.lat, coord1.lng) ||
    !isValidCoordinate(coord2.lat, coord2.lng)
  ) {
    return null;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 1 decimal place (e.g., 3.4 km)
  return Math.round(distance * 10) / 10;
}

/**
 * Formats distance in km for human-readable display.
 * Returns null if distance is not available.
 */
export function formatDistance(distanceKm: number | null | undefined): string | null {
  if (distanceKm === null || distanceKm === undefined || Number.isNaN(distanceKm)) {
    return null;
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export interface DestinationInfo {
  name?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Generates an authentic Google Maps directions URL for navigation to a verified clinic.
 * Incorporates user coordinates as origin when permitted by the user.
 */
export function getGoogleMapsDirectionsUrl(
  destination: DestinationInfo,
  userLocation?: Coordinates | null
): string {
  const baseUrl = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams();

  // Set destination
  if (
    destination.latitude !== null &&
    destination.latitude !== undefined &&
    destination.longitude !== null &&
    destination.longitude !== undefined &&
    isValidCoordinate(destination.latitude, destination.longitude)
  ) {
    params.set("destination", `${destination.latitude},${destination.longitude}`);
  } else {
    // Fall back to clean verified address text without faking coordinates
    const addressParts = [
      destination.name,
      destination.address,
      destination.city || "Bhopal",
      destination.state || "Madhya Pradesh",
      destination.pincode,
    ].filter(Boolean);
    params.set("destination", addressParts.join(", "));
  }

  // Set origin if verified user coordinates are provided
  if (
    userLocation &&
    isValidCoordinate(userLocation.lat, userLocation.lng)
  ) {
    params.set("origin", `${userLocation.lat},${userLocation.lng}`);
  }

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Generates a Google Maps search/place URL for a clinic.
 */
export function getGoogleMapsPlaceUrl(destination: DestinationInfo): string {
  const baseUrl = "https://www.google.com/maps/search/?api=1";
  const params = new URLSearchParams();

  if (
    destination.latitude !== null &&
    destination.latitude !== undefined &&
    destination.longitude !== null &&
    destination.longitude !== undefined &&
    isValidCoordinate(destination.latitude, destination.longitude)
  ) {
    params.set("query", `${destination.latitude},${destination.longitude}`);
  } else {
    const addressParts = [
      destination.name,
      destination.address,
      destination.city || "Bhopal",
      destination.state || "Madhya Pradesh",
    ].filter(Boolean);
    params.set("query", addressParts.join(", "));
  }

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Filters a clinic list to only those with valid, verified coordinates.
 */
export function filterClinicsWithCoordinates(clinics: Clinic[]): Clinic[] {
  return clinics.filter((c) => isValidCoordinate(c.latitude, c.longitude));
}
