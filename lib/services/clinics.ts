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
      throw error;
    }

    return (data as Clinic[]) ?? [];
  } catch (err) {
    console.error("[getClinics] Failed to fetch clinics:", err);
    throw err;
  }
}
