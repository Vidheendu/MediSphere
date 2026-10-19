import { supabase } from "@/lib/supabase";
import type { Clinic } from "@/types";

/**
 * Retrieves all clinics from Supabase.
 * Strictly queries the 'clinics' table with no fake data.
 * Returns records ordered alphabetically by name.
 */
export async function getClinics(): Promise<Clinic[]> {
  try {
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name, address, city, state, pincode, phone, website, latitude, longitude, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("[getClinics] Supabase error:", error.message);
      return [];
    }

    return (data as Clinic[]) ?? [];
  } catch (err) {
    console.error("[getClinics] Failed to fetch clinics:", err);
    return [];
  }
}

/**
 * Retrieves only clinics that have verified, valid coordinates.
 */
export async function getClinicsWithCoordinates(): Promise<Clinic[]> {
  try {
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name, address, city, state, pincode, phone, website, latitude, longitude, created_at, updated_at")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("[getClinicsWithCoordinates] Supabase error:", error.message);
      return [];
    }

    return ((data as Clinic[]) ?? []).filter(
      (c) => typeof c.latitude === "number" && typeof c.longitude === "number"
    );
  } catch (err) {
    console.error("[getClinicsWithCoordinates] Error:", err);
    return [];
  }
}

/**
 * Retrieves a single clinic by ID.
 */
export async function getClinicById(id: string): Promise<Clinic | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name, address, city, state, pincode, phone, website, latitude, longitude, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[getClinicById] Error fetching clinic ${id}:`, error.message);
      return null;
    }

    return (data as Clinic) ?? null;
  } catch (err) {
    console.error(`[getClinicById] Error:`, err);
    return null;
  }
}

