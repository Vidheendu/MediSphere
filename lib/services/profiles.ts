import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

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
