import { supabase } from "@/lib/supabase";
import type {
  AdminDashboardStats,
  DoctorWithDetails,
  Clinic,
  AppointmentWithDetails,
  AppointmentStatus,
  Profile,
  DoctorVerificationStatus,
  UserRole,
} from "@/types";

export interface AdminDoctorFilter {
  status?: DoctorVerificationStatus | "all";
  search?: string;
  specialityId?: string;
}

export interface AdminReviewItem {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  doctor_name: string;
  doctor_speciality: string;
  patient_name: string;
}

/**
 * Extracts import provenance URL from doctor about string if present.
 * Standard format: [Import Provenance: https://...]
 */
export function extractDoctorProvenance(about?: string | null): string | null {
  if (!about) return null;
  const match = about.match(/\[Import Provenance:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

/**
 * Formats a Date into Asia/Kolkata date and time strings.
 */
export function getAdminCurrentTimeIST(): { dateStr: string; timeStr: string } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return { dateStr, timeStr };
}

/**
 * Retrieves real-time administrative statistics from the database.
 * Strictly uses real database records in Asia/Kolkata timezone.
 * Uses get_admin_dashboard_stats stored procedure, with fallback to atomic aggregate selects.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    // 1. Attempt RPC call
    const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
    if (!error && data) {
      const stats = typeof data === "string" ? JSON.parse(data) : data;
      return stats as AdminDashboardStats;
    }

    if (error) {
      console.warn("[getAdminDashboardStats] RPC notice, calculating via direct aggregate queries:", error.message);
    }
  } catch (err) {
    console.warn("[getAdminDashboardStats] RPC exception, calculating via direct queries:", err);
  }

  // Fallback: Real database queries using authenticated admin session
  const { dateStr: todayIST, timeStr: timeIST } = getAdminCurrentTimeIST();

  const [
    doctorsRes,
    clinicsRes,
    appointmentsRes,
    profilesRes,
    reviewsRes,
  ] = await Promise.all([
    supabase.from("doctors").select("id, verification_status"),
    supabase.from("clinics").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id, status, appointment_date, start_time"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("doctor_reviews").select("id", { count: "exact", head: true }),
  ]);

  const doctorsList = doctorsRes.data || [];
  const totalDoctors = doctorsList.length;
  const pendingDoctors = doctorsList.filter((d) => d.verification_status === "pending").length;
  const verifiedDoctors = doctorsList.filter((d) => d.verification_status === "verified").length;
  const rejectedDoctors = doctorsList.filter((d) => d.verification_status === "rejected").length;
  const suspendedDoctors = doctorsList.filter((d) => d.verification_status === "suspended").length;

  const totalClinics = clinicsRes.count ?? 0;
  const totalUsers = profilesRes.count ?? 0;
  const totalReviews = reviewsRes.count ?? 0;

  const apptList = appointmentsRes.data || [];
  const totalAppointments = apptList.length;
  const upcomingAppointments = apptList.filter((a) => {
    if (a.status !== "confirmed") return false;
    if (a.appointment_date > todayIST) return true;
    if (a.appointment_date === todayIST && a.start_time >= timeIST) return true;
    return false;
  }).length;

  return {
    total_doctors: totalDoctors,
    pending_doctors: pendingDoctors,
    verified_doctors: verifiedDoctors,
    rejected_doctors: rejectedDoctors,
    suspended_doctors: suspendedDoctors,
    total_clinics: totalClinics,
    total_appointments: totalAppointments,
    upcoming_appointments: upcomingAppointments,
    total_users: totalUsers,
    total_reviews: totalReviews,
    timezone: "Asia/Kolkata",
    generated_at: new Date().toISOString(),
  };
}

/**
 * Retrieves all doctor records for administrative inspection.
 * Includes profile details, clinic, speciality, verification status, and rejection reason.
 */
export async function getAdminDoctors(filter?: AdminDoctorFilter): Promise<DoctorWithDetails[]> {
  try {
    let query = supabase
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
        rejection_reason,
        verified_at,
        created_at,
        updated_at,
        profile:profiles(id, full_name, email, phone, location, role),
        speciality:specialities(id, name, slug, description),
        clinic:clinics(id, name, address, city, state, pincode, phone, website, latitude, longitude)
      `)
      .order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") {
      query = query.eq("verification_status", filter.status);
    }

    if (filter?.specialityId) {
      query = query.eq("speciality_id", filter.specialityId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[getAdminDoctors] Error:", error.message);
      return [];
    }

    let results = (data as unknown as DoctorWithDetails[]) || [];

    if (filter?.search?.trim()) {
      const s = filter.search.toLowerCase().trim();
      results = results.filter((doc) => {
        const name = doc.profile?.full_name?.toLowerCase() || "";
        const qual = doc.qualification?.toLowerCase() || "";
        const spec = doc.speciality?.name?.toLowerCase() || "";
        const clinic = doc.clinic?.name?.toLowerCase() || "";
        return name.includes(s) || qual.includes(s) || spec.includes(s) || clinic.includes(s);
      });
    }

    return results;
  } catch (err) {
    console.error("[getAdminDoctors] Failed:", err);
    return [];
  }
}

/**
 * Updates a doctor's verification status (verify, reject, suspend, pending).
 * Enforces server-side authorization check (is_admin).
 */
export async function updateDoctorVerification(
  doctorId: string,
  status: DoctorVerificationStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!doctorId) {
    return { success: false, error: "Doctor ID is required." };
  }

  const validStatuses: DoctorVerificationStatus[] = ["pending", "verified", "rejected", "suspended"];
  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}` };
  }

  try {
    // 1. Try stored procedure admin_update_doctor_status
    const { data, error: rpcError } = await supabase.rpc("admin_update_doctor_status", {
      p_doctor_id: doctorId,
      p_status: status,
      p_reason: reason?.trim() ? reason.trim() : null,
    });

    if (!rpcError && data) {
      return { success: true };
    }

    if (rpcError) {
      console.warn("[updateDoctorVerification] RPC fallback:", rpcError.message);
    }

    // 2. Direct table update fallback (enforced by RLS is_admin())
    const updatePayload: {
      verification_status: DoctorVerificationStatus;
      rejection_reason: string | null;
      verified_at: string | null;
      updated_at: string;
    } = {
      verification_status: status,
      rejection_reason: status === "rejected" ? reason?.trim() || null : null,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("doctors")
      .update(updatePayload)
      .eq("id", doctorId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update doctor verification status.";
    return { success: false, error: msg };
  }
}

/**
 * Retrieves all clinics for administration, including doctor counts.
 */
export async function getAdminClinics(search?: string): Promise<Array<Clinic & { doctorCount: number }>> {
  try {
    const [clinicsRes, doctorsRes] = await Promise.all([
      supabase.from("clinics").select("*").order("name", { ascending: true }),
      supabase.from("doctors").select("id, clinic_id"),
    ]);

    if (clinicsRes.error) {
      console.error("[getAdminClinics] Error:", clinicsRes.error.message);
      return [];
    }

    const clinicsList = clinicsRes.data || [];
    const doctorsList = doctorsRes.data || [];

    // Count doctors per clinic
    const docCountMap = new Map<string, number>();
    for (const doc of doctorsList) {
      if (doc.clinic_id) {
        docCountMap.set(doc.clinic_id, (docCountMap.get(doc.clinic_id) || 0) + 1);
      }
    }

    let results = clinicsList.map((c) => ({
      ...c,
      doctorCount: docCountMap.get(c.id) || 0,
    }));

    if (search?.trim()) {
      const s = search.toLowerCase().trim();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.address?.toLowerCase().includes(s) ||
          c.city?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s)
      );
    }

    return results;
  } catch (err) {
    console.error("[getAdminClinics] Failed:", err);
    return [];
  }
}

/**
 * Updates permitted clinic details (name, address, city, state, pincode, phone, website, latitude, longitude).
 * Strictly enforced by Supabase RLS is_admin().
 */
export async function updateAdminClinic(
  clinicId: string,
  updates: Partial<Pick<Clinic, "name" | "address" | "city" | "state" | "pincode" | "phone" | "website" | "latitude" | "longitude">>
): Promise<{ success: boolean; error?: string }> {
  if (!clinicId) {
    return { success: false, error: "Clinic ID is required." };
  }

  try {
    const { error } = await supabase
      .from("clinics")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clinicId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update clinic.";
    return { success: false, error: msg };
  }
}

/**
 * Retrieves appointments for administrative oversight.
 * Excludes unnecessary clinical notes; shows appointment ID, doctor, patient, date, time, and status.
 */
export async function getAdminAppointments(filter?: {
  status?: string;
  search?: string;
  date?: string;
}): Promise<AppointmentWithDetails[]> {
  try {
    let query = supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        doctor_id,
        slot_id,
        appointment_date,
        start_time,
        end_time,
        status,
        reason,
        created_at,
        updated_at,
        doctor:doctors(
          id,
          profile_id,
          speciality_id,
          qualification,
          consultation_fee,
          profile:profiles(id, full_name, email, phone),
          speciality:specialities(id, name, slug),
          clinic:clinics(id, name, address, city)
        ),
        patient:profiles(id, full_name, email, phone, location)
      `)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (filter?.status && filter.status !== "all") {
      query = query.eq("status", filter.status as AppointmentStatus);
    }

    if (filter?.date) {
      query = query.eq("appointment_date", filter.date);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[getAdminAppointments] Error:", error.message);
      return [];
    }

    let results = (data as unknown as AppointmentWithDetails[]) || [];

    if (filter?.search?.trim()) {
      const s = filter.search.toLowerCase().trim();
      results = results.filter((appt) => {
        const id = appt.id.toLowerCase();
        const docName = appt.doctor?.profile?.full_name?.toLowerCase() || "";
        const patName = appt.patient?.full_name?.toLowerCase() || "";
        const specName = appt.doctor?.speciality?.name?.toLowerCase() || "";
        return id.includes(s) || docName.includes(s) || patName.includes(s) || specName.includes(s);
      });
    }

    return results;
  } catch (err) {
    console.error("[getAdminAppointments] Failed:", err);
    return [];
  }
}

/**
 * Retrieves registered user accounts for administration.
 * Strictly read-only; never exposes passwords, tokens, or security credentials.
 */
export async function getAdminUsers(filter?: {
  role?: UserRole | "all";
  search?: string;
}): Promise<Profile[]> {
  try {
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, phone, location, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (filter?.role && filter.role !== "all") {
      query = query.eq("role", filter.role);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[getAdminUsers] Error:", error.message);
      return [];
    }

    let results = (data as Profile[]) || [];

    if (filter?.search?.trim()) {
      const s = filter.search.toLowerCase().trim();
      results = results.filter((u) => {
        const name = u.full_name?.toLowerCase() || "";
        const email = u.email?.toLowerCase() || "";
        const phone = u.phone?.toLowerCase() || "";
        const loc = u.location?.toLowerCase() || "";
        return name.includes(s) || email.includes(s) || phone.includes(s) || loc.includes(s);
      });
    }

    return results;
  } catch (err) {
    console.error("[getAdminUsers] Failed:", err);
    return [];
  }
}

/**
 * Retrieves all doctor reviews for administrative review oversight.
 */
export async function getAdminReviews(filter?: {
  search?: string;
  minRating?: number;
  maxRating?: number;
}): Promise<AdminReviewItem[]> {
  try {
    let query = supabase
      .from("doctor_reviews")
      .select(`
        id,
        doctor_id,
        patient_id,
        appointment_id,
        rating,
        review_text,
        created_at,
        updated_at,
        doctor:doctors(
          id,
          profile:profiles(full_name),
          speciality:specialities(name)
        ),
        patient:profiles(full_name)
      `)
      .order("created_at", { ascending: false });

    if (typeof filter?.minRating === "number") {
      query = query.gte("rating", filter.minRating);
    }

    if (typeof filter?.maxRating === "number") {
      query = query.lte("rating", filter.maxRating);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[getAdminReviews] Error:", error.message);
      return [];
    }

    const rawList = data as unknown as Array<{
      id: string;
      doctor_id: string;
      patient_id: string;
      appointment_id: string;
      rating: number;
      review_text: string | null;
      created_at: string;
      updated_at: string;
      doctor?: {
        profile?: { full_name?: string | null } | null;
        speciality?: { name?: string | null } | null;
      } | null;
      patient?: { full_name?: string | null } | null;
    }>;

    let items: AdminReviewItem[] = (rawList || []).map((r) => ({
      id: r.id,
      doctor_id: r.doctor_id,
      patient_id: r.patient_id,
      appointment_id: r.appointment_id,
      rating: r.rating,
      review_text: r.review_text,
      created_at: r.created_at,
      updated_at: r.updated_at,
      doctor_name: r.doctor?.profile?.full_name || "Practitioner",
      doctor_speciality: r.doctor?.speciality?.name || "Specialist",
      patient_name: r.patient?.full_name || "Verified Patient",
    }));

    if (filter?.search?.trim()) {
      const s = filter.search.toLowerCase().trim();
      items = items.filter(
        (r) =>
          r.doctor_name.toLowerCase().includes(s) ||
          r.patient_name.toLowerCase().includes(s) ||
          r.review_text?.toLowerCase().includes(s)
      );
    }

    return items;
  } catch (err) {
    console.error("[getAdminReviews] Failed:", err);
    return [];
  }
}

/**
 * Deletes a review for moderation purposes (enforced by RLS is_admin()).
 */
export async function deleteAdminReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  if (!reviewId) {
    return { success: false, error: "Review ID is required." };
  }

  try {
    const { error } = await supabase.from("doctor_reviews").delete().eq("id", reviewId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete review.";
    return { success: false, error: msg };
  }
}
