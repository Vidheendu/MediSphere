import { supabase } from "@/lib/supabase";
import type { Speciality } from "@/types";

/**
 * Retrieves all medical specialities from Supabase.
 * Strictly queries the 'specialities' table.
 * Returns records ordered alphabetically by name.
 */
export async function getSpecialities(): Promise<Speciality[]> {
  try {
    const { data, error } = await supabase
      .from("specialities")
      .select("id, name, slug, description, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("[getSpecialities] Supabase error:", error.message);
      throw error;
    }

    return (data as Speciality[]) ?? [];
  } catch (err) {
    console.error("[getSpecialities] Failed to fetch specialities:", err);
    throw err;
  }
}
