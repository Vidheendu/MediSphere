import { supabase } from "@/lib/supabase";
import type { DoctorWithDetails } from "@/types";

export interface DoctorFilterOptions {
  search?: string;
  specialitySlug?: string;
  specialityId?: string;
  city?: string;
  feeRange?: "under-500" | "500-1000" | "1000-plus" | "all";
  sortBy?: "relevance" | "experience" | "fee_asc" | "fee_desc" | "name";
}

/**
 * Public profile select definition:
 * Excludes private doctor account information (phone, email) for public security.
 */
const PUBLIC_DOCTOR_SELECT = `
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
  profile:profiles(id, full_name, location, role),
  speciality:specialities(id, name, slug, description),
  clinic:clinics(id, name, address, city, state, pincode, phone, website, latitude, longitude)
`;

/**
 * Retrieves all verified doctors from Supabase.
 * Strictly queries the 'doctors' table where verification_status = 'verified'.
 * Never creates or returns fake doctors, placeholder ratings, or mock fees.
 */
export async function getDoctors(): Promise<DoctorWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from("doctors")
      .select(PUBLIC_DOCTOR_SELECT)
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
        return [];
      }

      return (fallback.data as unknown as DoctorWithDetails[]) ?? [];
    }

    return (data as unknown as DoctorWithDetails[]) ?? [];
  } catch (err) {
    console.error("[getDoctors] Failed to fetch verified doctors:", err);
    return [];
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
      .select(PUBLIC_DOCTOR_SELECT)
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
        return null;
      }

      return (fallback.data as unknown as DoctorWithDetails) ?? null;
    }

    return (data as unknown as DoctorWithDetails) ?? null;
  } catch (err) {
    console.error(`[getDoctorById] Failed to fetch doctor ${id}:`, err);
    return null;
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
      .select(PUBLIC_DOCTOR_SELECT)
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

/**
 * Searches and filters verified doctors from Supabase.
 * Filters at the database level where practical:
 * - verification_status = 'verified'
 * - speciality_id
 * - consultation_fee range (only when consultation_fee exists)
 *
 * Then applies keyword search across doctor name, speciality name,
 * clinic name, and city/location.
 */
export async function searchVerifiedDoctors(
  filters: DoctorFilterOptions = {}
): Promise<DoctorWithDetails[]> {
  try {
    let query = supabase
      .from("doctors")
      .select(PUBLIC_DOCTOR_SELECT)
      .eq("verification_status", "verified");

    // Database-level filtering for speciality ID if supplied
    if (filters.specialityId) {
      query = query.eq("speciality_id", filters.specialityId);
    }

    // Database-level fee filtering (only applies if consultation_fee exists)
    if (filters.feeRange && filters.feeRange !== "all") {
      if (filters.feeRange === "under-500") {
        query = query.lte("consultation_fee", 500);
      } else if (filters.feeRange === "500-1000") {
        query = query.gte("consultation_fee", 500).lte("consultation_fee", 1000);
      } else if (filters.feeRange === "1000-plus") {
        query = query.gte("consultation_fee", 1000);
      }
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    let list: DoctorWithDetails[] = [];

    if (error) {
      console.warn("[searchVerifiedDoctors] Query returned notice:", error.message);
      // Fallback to table-only select
      const fallback = await supabase
        .from("doctors")
        .select("id, profile_id, speciality_id, clinic_id, qualification, experience_years, consultation_fee, about, verification_status, created_at, updated_at")
        .eq("verification_status", "verified");

      if (fallback.error) {
        return [];
      }
      list = (fallback.data as unknown as DoctorWithDetails[]) ?? [];
    } else {
      list = (data as unknown as DoctorWithDetails[]) ?? [];
    }

    // Secondary relational filters (speciality slug, city, search terms)
    if (filters.specialitySlug && filters.specialitySlug !== "all") {
      const targetSlug = filters.specialitySlug.toLowerCase().trim();
      list = list.filter((doc) => {
        const slug = doc.speciality?.slug?.toLowerCase();
        const name = doc.speciality?.name?.toLowerCase();
        return slug === targetSlug || name === targetSlug;
      });
    }

    if (filters.city && filters.city !== "all") {
      const targetCity = filters.city.toLowerCase().trim();
      list = list.filter((doc) => {
        const clinicCity = doc.clinic?.city?.toLowerCase() || "";
        const profileLoc = doc.profile?.location?.toLowerCase() || "";
        return clinicCity.includes(targetCity) || profileLoc.includes(targetCity);
      });
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.toLowerCase().trim();
      list = list.filter((doc) => {
        const docName = doc.profile?.full_name?.toLowerCase() || "";
        const specName = doc.speciality?.name?.toLowerCase() || "";
        const clinicName = doc.clinic?.name?.toLowerCase() || "";
        const clinicCity = doc.clinic?.city?.toLowerCase() || "";
        const clinicAddr = doc.clinic?.address?.toLowerCase() || "";
        const location = doc.profile?.location?.toLowerCase() || "";
        const qualification = doc.qualification?.toLowerCase() || "";

        return (
          docName.includes(term) ||
          specName.includes(term) ||
          clinicName.includes(term) ||
          clinicCity.includes(term) ||
          clinicAddr.includes(term) ||
          location.includes(term) ||
          qualification.includes(term)
        );
      });
    }

    // Sorting
    if (filters.sortBy) {
      if (filters.sortBy === "experience") {
        list.sort((a, b) => (b.experience_years ?? 0) - (a.experience_years ?? 0));
      } else if (filters.sortBy === "fee_asc") {
        list.sort((a, b) => (a.consultation_fee ?? Infinity) - (b.consultation_fee ?? Infinity));
      } else if (filters.sortBy === "fee_desc") {
        list.sort((a, b) => (b.consultation_fee ?? 0) - (a.consultation_fee ?? 0));
      } else if (filters.sortBy === "name") {
        list.sort((a, b) => {
          const nameA = a.profile?.full_name || "";
          const nameB = b.profile?.full_name || "";
          return nameA.localeCompare(nameB);
        });
      }
    }

    return list;
  } catch (err) {
    console.error("[searchVerifiedDoctors] Query error:", err);
    return [];
  }
}


