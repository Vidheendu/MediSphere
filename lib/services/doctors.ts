import { supabase } from "@/lib/supabase";
import type { DoctorWithDetails } from "@/types";

/**
 * Retrieves all verified doctors from Supabase.
 * Strictly queries the 'doctors' table where verification_status = 'verified'.
 * Never creates or returns fake doctors, placeholder ratings, or mock fees.
 */
export async function getDoctors(): Promise<DoctorWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from("doctors")
      .select(`
        id,
        profile_id,
        speciality_id,
        clinic_id,
        qualification,
        experience_years,
        consultation_fee,
        about,
        verification_status,
        created_at,
        updated_at,
        profile:profiles(id, full_name, phone, email, location, role),
        speciality:specialities(id, name, slug, description),
        clinic:clinics(id, name, address, city, state, pincode, phone, website, latitude, longitude)
      `)
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(
        "[getDoctors] Relational select failed, falling back to basic query:",
        error.message
      );
      // Fallback to table-only select if relational join is constrained
      const fallback = await supabase
        .from("doctors")
        .select("id, profile_id, speciality_id, clinic_id, qualification, experience_years, consultation_fee, about, verification_status, created_at, updated_at")
        .eq("verification_status", "verified")
        .order("created_at", { ascending: false });

      if (fallback.error) {
        console.error("[getDoctors] Supabase error:", fallback.error.message);
        throw fallback.error;
      }

      return (fallback.data as unknown as DoctorWithDetails[]) ?? [];
    }

    return (data as unknown as DoctorWithDetails[]) ?? [];
  } catch (err) {
    console.error("[getDoctors] Failed to fetch verified doctors:", err);
    throw err;
  }
}

/**
 * Retrieves a single doctor by ID from Supabase.
 * Strictly ensures verification_status = 'verified'.
 * Returns null if the doctor is not found or is not verified.
 */
export async function getDoctorById(id: string): Promise<DoctorWithDetails | null> {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from("doctors")
      .select(`
        id,
        profile_id,
        speciality_id,
        clinic_id,
        qualification,
        experience_years,
        consultation_fee,
        about,
        verification_status,
        created_at,
        updated_at,
        profile:profiles(id, full_name, phone, email, location, role),
        speciality:specialities(id, name, slug, description),
        clinic:clinics(id, name, address, city, state, pincode, phone, website, latitude, longitude)
      `)
      .eq("id", id)
      .eq("verification_status", "verified")
      .maybeSingle();

    if (error) {
      console.warn(
        `[getDoctorById] Relational select failed for doctor ${id}, falling back:`,
        error.message
      );
      const fallback = await supabase
        .from("doctors")
        .select("id, profile_id, speciality_id, clinic_id, qualification, experience_years, consultation_fee, about, verification_status, created_at, updated_at")
        .eq("id", id)
        .eq("verification_status", "verified")
        .maybeSingle();

      if (fallback.error) {
        console.error("[getDoctorById] Supabase error:", fallback.error.message);
        throw fallback.error;
      }

      return (fallback.data as unknown as DoctorWithDetails) ?? null;
    }

    return (data as unknown as DoctorWithDetails) ?? null;
  } catch (err) {
    console.error(`[getDoctorById] Failed to fetch doctor ${id}:`, err);
    throw err;
  }
}

/**
 * Retrieves all verified doctors within a specific speciality.
 * Strictly requires verification_status = 'verified'.
 * Returns empty array if no verified doctors exist for this speciality.
 */
export async function getDoctorsBySpecialityId(
  specialityId: string
): Promise<DoctorWithDetails[]> {
  if (!specialityId) return [];

  try {
    const { data, error } = await supabase
      .from("doctors")
      .select(`
        id,
        profile_id,
        speciality_id,
        clinic_id,
        qualification,
        experience_years,
        consultation_fee,
        about,
        verification_status,
        created_at,
        updated_at,
        profile:profiles(id, full_name, phone, email, location, role),
        speciality:specialities(id, name, slug, description),
        clinic:clinics(id, name, address, city, state, pincode, phone, website, latitude, longitude)
      `)
      .eq("speciality_id", specialityId)
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(
        `[getDoctorsBySpecialityId] Query error for speciality ${specialityId}:`,
        error.message
      );
      const fallback = await supabase
        .from("doctors")
        .select("id, profile_id, speciality_id, clinic_id, qualification, experience_years, consultation_fee, about, verification_status, created_at, updated_at")
        .eq("speciality_id", specialityId)
        .eq("verification_status", "verified")
        .order("created_at", { ascending: false });

      if (fallback.error) {
        return [];
      }

      return (fallback.data as unknown as DoctorWithDetails[]) ?? [];
    }

    return (data as unknown as DoctorWithDetails[]) ?? [];
  } catch {
    return [];
  }
}

