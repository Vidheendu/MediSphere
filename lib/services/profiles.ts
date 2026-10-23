import { supabase } from "@/lib/supabase";
import type { Profile, Doctor, NotificationPreferences } from "@/types";
export type { NotificationPreferences };

export interface UpdatePatientProfileParams {
  full_name: string;
  phone?: string | null;
  location?: string | null;
}

export interface ProfileOperationResult {
  success: boolean;
  profile?: Profile;
  error?: string;
}

/**
 * Retrieves the profile of the currently authenticated patient from Supabase.
 * Returns null if unauthenticated or profile does not exist.
 */
export async function getPatientProfile(): Promise<Profile | null> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (error) {
      console.error("[getPatientProfile] Supabase error:", error.message);
      return null;
    }

    return (data as Profile) ?? null;
  } catch (err) {
    console.error("[getPatientProfile] Unexpected error:", err);
    return null;
  }
}

/**
 * Updates permitted profile fields for the authenticated patient:
 * - full_name (required, trimmed, 2-100 chars)
 * - phone (optional, trimmed, valid format)
 * - location (optional, trimmed, max 100 chars)
 *
 * Security guarantees:
 * - Uses auth.getUser() to determine caller identity.
 * - Never trusts browser-supplied patient ID.
 * - Role cannot be changed under any circumstance (enforced by RLS and omitted from update payload).
 * - Synchronizes auth user metadata with updated profile information.
 */
export async function updatePatientProfile(
  params: UpdatePatientProfileParams
): Promise<ProfileOperationResult> {
  try {
    // 1. Identify caller via authenticated session
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return {
        success: false,
        error: "You must be signed in to update your profile.",
      };
    }

    const userId = authData.user.id;

    // 2. Validate input fields
    const fullName = params.full_name?.trim();
    if (!fullName || fullName.length < 2) {
      return {
        success: false,
        error: "Please enter a valid full name (at least 2 characters).",
      };
    }

    if (fullName.length > 100) {
      return {
        success: false,
        error: "Full name cannot exceed 100 characters.",
      };
    }

    const phone = params.phone !== undefined ? params.phone?.trim() || null : undefined;
    if (phone) {
      // Basic phone format validation (allows digits, spaces, dashes, parentheses, leading plus)
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        return {
          success: false,
          error: "Please enter a valid phone number (10 to 15 digits).",
        };
      }
    }

    const location = params.location !== undefined ? params.location?.trim() || null : undefined;
    if (location && location.length > 100) {
      return {
        success: false,
        error: "Location cannot exceed 100 characters.",
      };
    }

    // 3. Prepare sanitized update payload (strictly excluding 'role' and 'id')
    const updatePayload: {
      full_name: string;
      phone?: string | null;
      location?: string | null;
      updated_at: string;
    } = {
      full_name: fullName,
      updated_at: new Date().toISOString(),
    };

    if (phone !== undefined) {
      updatePayload.phone = phone;
    }

    if (location !== undefined) {
      updatePayload.location = location;
    }

    // 4. Update profile in database
    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      console.error("[updatePatientProfile] DB update error:", error.message);
      return {
        success: false,
        error: error.message || "Failed to update profile. Please try again.",
      };
    }

    // 5. Sync metadata with Supabase Auth session for seamless UI updates
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          ...(phone !== undefined ? { phone } : {}),
          ...(location !== undefined ? { location } : {}),
        },
      });
    } catch (metaErr) {
      console.warn("[updatePatientProfile] Auth metadata sync warning:", metaErr);
    }

    return {
      success: true,
      profile: data as Profile,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return {
      success: false,
      error: message,
    };
  }
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailAlerts: true,
  appointmentReminders: true,
  statusUpdates: true,
};

const PREFS_STORAGE_KEY = "medisphere_notification_preferences";

/**
 * Retrieves the authenticated user's notification preferences from auth metadata or localStorage fallback.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const metaPrefs = authData?.user?.user_metadata?.notification_preferences as NotificationPreferences | undefined;

    if (metaPrefs && typeof metaPrefs.emailAlerts === "boolean") {
      return metaPrefs;
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as NotificationPreferences;
      }
    }

    return DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Updates the authenticated user's notification preferences.
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; preferences: NotificationPreferences; error?: string }> {
  try {
    const current = await getNotificationPreferences();
    const updated: NotificationPreferences = {
      ...current,
      ...preferences,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
    }

    // Persist to Supabase auth user metadata if authenticated
    try {
      await supabase.auth.updateUser({
        data: {
          notification_preferences: updated,
        },
      });
    } catch (metaErr) {
      console.warn("[updateNotificationPreferences] Session metadata update warning:", metaErr);
    }

    return { success: true, preferences: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update notification preferences.";
    return { success: false, preferences: DEFAULT_NOTIFICATION_PREFERENCES, error: message };
  }
}

export interface UpdateDoctorProfileParams {
  full_name?: string;
  phone?: string | null;
  location?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  consultation_fee?: number | null;
  about?: string | null;
}

export interface DoctorProfileDetailsResult {
  success: boolean;
  profile?: Profile;
  doctor?: Doctor;
  error?: string;
}

/**
 * Retrieves doctor details and linked profile for the authenticated doctor.
 */
export async function getDoctorSelfDetails(): Promise<{ profile: Profile | null; doctor: Doctor | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { profile: null, doctor: null };
    }

    const userId = authData.user.id;

    const [profRes, docRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("doctors").select("*").eq("profile_id", userId).maybeSingle(),
    ]);

    return {
      profile: (profRes.data as Profile) ?? null,
      doctor: (docRes.data as Doctor) ?? null,
    };
  } catch (err) {
    console.error("[getDoctorSelfDetails] Error:", err);
    return { profile: null, doctor: null };
  }
}

/**
 * Updates doctor profile fields.
 * Security guarantees:
 * - Uses auth.getUser() to determine caller identity.
 * - Modifies ONLY doctor's own record (profile_id = user.id).
 * - NEVER permits updating 'role' (cannot escalate role).
 * - NEVER permits updating 'verification_status' (managed solely by administrators).
 * - Validates experience (>= 0), fee (>= 0), qualification and about strings.
 */
export async function updateDoctorProfileDetails(
  params: UpdateDoctorProfileParams
): Promise<DoctorProfileDetailsResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { success: false, error: "You must be signed in to update your profile." };
    }

    const userId = authData.user.id;

    // 1. Validate inputs
    const fullName = params.full_name?.trim();
    if (params.full_name !== undefined) {
      if (!fullName || fullName.length < 2) {
        return { success: false, error: "Please enter a valid full name (at least 2 characters)." };
      }
      if (fullName.length > 100) {
        return { success: false, error: "Full name cannot exceed 100 characters." };
      }
    }

    const phone = params.phone !== undefined ? params.phone?.trim() || null : undefined;
    if (phone) {
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        return { success: false, error: "Please enter a valid phone number (10 to 15 digits)." };
      }
    }

    const location = params.location !== undefined ? params.location?.trim() || null : undefined;
    if (location && location.length > 100) {
      return { success: false, error: "Location cannot exceed 100 characters." };
    }

    const qualification = params.qualification !== undefined ? params.qualification?.trim() || null : undefined;
    if (qualification && qualification.length > 150) {
      return { success: false, error: "Qualification cannot exceed 150 characters." };
    }

    const experienceYears = params.experience_years;
    if (experienceYears !== undefined && experienceYears !== null) {
      if (typeof experienceYears !== "number" || experienceYears < 0 || experienceYears > 70) {
        return { success: false, error: "Experience years must be a valid number between 0 and 70." };
      }
    }

    const consultationFee = params.consultation_fee;
    if (consultationFee !== undefined && consultationFee !== null) {
      if (typeof consultationFee !== "number" || consultationFee < 0 || consultationFee > 50000) {
        return { success: false, error: "Consultation fee must be a valid amount between 0 and 50,000 INR." };
      }
    }

    const about = params.about !== undefined ? params.about?.trim() || null : undefined;
    if (about && about.length > 2000) {
      return { success: false, error: "About section cannot exceed 2,000 characters." };
    }

    // 2. Update profile table fields (excluding role, id, email)
    const profilePayload: {
      full_name?: string;
      phone?: string | null;
      location?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) profilePayload.full_name = fullName;
    if (phone !== undefined) profilePayload.phone = phone;
    if (location !== undefined) profilePayload.location = location;

    const { data: updatedProfile, error: profileErr } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", userId)
      .select()
      .single();

    if (profileErr) {
      return { success: false, error: profileErr.message || "Failed to update profile information." };
    }

    // 3. Update doctor table fields (strictly excluding verification_status, profile_id, id)
    const doctorPayload: {
      qualification?: string | null;
      experience_years?: number | null;
      consultation_fee?: number | null;
      about?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (qualification !== undefined) doctorPayload.qualification = qualification;
    if (experienceYears !== undefined) doctorPayload.experience_years = experienceYears;
    if (consultationFee !== undefined) doctorPayload.consultation_fee = consultationFee;
    if (about !== undefined) doctorPayload.about = about;

    // Check if doctor record exists
    const { data: existingDoc } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    let updatedDoctor: Doctor | undefined;

    if (existingDoc) {
      const { data: docData, error: docErr } = await supabase
        .from("doctors")
        .update(doctorPayload)
        .eq("profile_id", userId)
        .select()
        .single();

      if (docErr) {
        return { success: false, error: docErr.message || "Failed to update doctor details." };
      }
      updatedDoctor = docData as Doctor;
    }

    // 4. Update auth user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          ...(fullName ? { full_name: fullName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(location !== undefined ? { location } : {}),
        },
      });
    } catch (metaErr) {
      console.warn("[updateDoctorProfileDetails] Metadata sync warning:", metaErr);
    }

    return {
      success: true,
      profile: updatedProfile as Profile,
      doctor: updatedDoctor,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}
