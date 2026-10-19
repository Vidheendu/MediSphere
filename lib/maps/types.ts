import type { Clinic } from "@/types";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type LocationPermissionState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported";

export type MapLoadStatus = "loading" | "ready" | "no_key" | "error";

export interface ClinicWithDistance extends Clinic {
  distanceKm?: number | null;
}

export interface MapMarkerData {
  clinic: Clinic;
  position: Coordinates;
}
