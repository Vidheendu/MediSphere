import { supabase } from "@/lib/supabase";
import type { DoctorVerificationStatus } from "@/types";

/**
 * Raw input format for importing doctor records from verified sources.
 */
export interface RawDoctorRecord {
  name: string;
  speciality: string;
  qualification?: string | null;
  experience_years?: number | null;
  consultation_fee?: number | null;
  about?: string | null;
  clinic?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  website?: string | null;
  source: string;
  verification_status?: string;
  profile_id?: string | null;
}

/**
 * Raw input format for importing clinic records from verified sources.
 */
export interface RawClinicRecord {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
  verification_status?: string | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

export interface ImportSummary {
  total: number;
  imported: number;
  skippedDuplicates: number;
  failedValidation: number;
  errors: Array<{ identifier: string; reason: string }>;
}

export const ALLOWED_SPECIALITIES = [
  "Dermatology",
  "ENT",
  "Dentistry",
  "Cardiology",
  "Neurology",
  "Orthopedics",
] as const;

/**
 * Validates a doctor record against mandatory fields, allowed specialities, and formats.
 */
export function validateDoctorRecord(record: Partial<RawDoctorRecord>): ValidationResult {
  const errors: ValidationIssue[] = [];

  // 1. Required: name
  if (!record.name || typeof record.name !== "string" || record.name.trim().length < 2) {
    errors.push({
      field: "name",
      message: "Doctor name is required and must be at least 2 characters.",
    });
  }

  // 2. Required: speciality (must match canonical Bhopal list)
  if (!record.speciality || typeof record.speciality !== "string") {
    errors.push({
      field: "speciality",
      message: "Speciality is required.",
    });
  } else {
    const matched = ALLOWED_SPECIALITIES.some(
      (s) => s.toLowerCase() === record.speciality?.trim().toLowerCase()
    );
    if (!matched) {
      errors.push({
        field: "speciality",
        message: `Speciality '${record.speciality}' is invalid. Must be one of: ${ALLOWED_SPECIALITIES.join(", ")}.`,
      });
    }
  }

  // 3. Required: source (provenance tracking)
  if (!record.source || typeof record.source !== "string" || record.source.trim().length < 5) {
    errors.push({
      field: "source",
      message: "Source is required (minimum 5 characters) to preserve data provenance from public registries.",
    });
  }

  // 4. Validate experience_years if provided
  if (record.experience_years !== undefined && record.experience_years !== null) {
    if (
      typeof record.experience_years !== "number" ||
      !Number.isInteger(record.experience_years) ||
      record.experience_years < 0
    ) {
      errors.push({
        field: "experience_years",
        message: "Experience years must be a non-negative integer or null.",
      });
    }
  }

  // 5. Validate consultation_fee if provided
  if (record.consultation_fee !== undefined && record.consultation_fee !== null) {
    if (typeof record.consultation_fee !== "number" || record.consultation_fee < 0) {
      errors.push({
        field: "consultation_fee",
        message: "Consultation fee must be a non-negative number or null.",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a clinic record against required fields and coordinate constraints.
 */
export function validateClinicRecord(record: Partial<RawClinicRecord>): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (!record.name || typeof record.name !== "string" || record.name.trim().length < 2) {
    errors.push({
      field: "name",
      message: "Clinic name is required and must be at least 2 characters.",
    });
  }

  if (!record.source || typeof record.source !== "string" || record.source.trim().length < 5) {
    errors.push({
      field: "source",
      message: "Source is required (minimum 5 characters) to preserve provenance.",
    });
  }

  if (record.latitude !== undefined && record.latitude !== null) {
    if (typeof record.latitude !== "number" || record.latitude < -90 || record.latitude > 90) {
      errors.push({
        field: "latitude",
        message: "Latitude must be between -90 and 90 or null.",
      });
    }
  }

  if (record.longitude !== undefined && record.longitude !== null) {
    if (typeof record.longitude !== "number" || record.longitude < -180 || record.longitude > 180) {
      errors.push({
        field: "longitude",
        message: "Longitude must be between -180 and 180 or null.",
      });
    }
  }

  if (record.verification_status !== undefined && record.verification_status !== null) {
    const validStatuses = ["pending", "verified"];
    if (!validStatuses.includes(record.verification_status)) {
      errors.push({
        field: "verification_status",
        message: "Verification status must be 'pending' or 'verified'.",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Finds or creates a clinic by name and city.
 * Returns the clinic's UUID if found or newly inserted.
 */
export async function findOrCreateClinic(
  clinicName: string,
  clinicData?: Partial<RawClinicRecord>
): Promise<string | null> {
  const trimmedName = clinicName.trim();
  const city = clinicData?.city?.trim() || "Bhopal";

  // Check if clinic already exists
  const { data: existing, error: findError } = await supabase
    .from("clinics")
    .select("id")
    .ilike("name", trimmedName)
    .ilike("city", city)
    .maybeSingle();

  if (findError) {
    console.warn(`[findOrCreateClinic] Error checking existing clinic ${trimmedName}:`, findError.message);
  }

  if (existing?.id) {
    return existing.id;
  }

  // Create new clinic record
  const { data: created, error: createError } = await supabase
    .from("clinics")
    .insert({
      name: trimmedName,
      address: clinicData?.address?.trim() || null,
      city: city,
      state: clinicData?.state?.trim() || "Madhya Pradesh",
      pincode: clinicData?.pincode?.trim() || null,
      phone: clinicData?.phone?.trim() || null,
      website: clinicData?.website?.trim() || null,
      latitude: clinicData?.latitude ?? null,
      longitude: clinicData?.longitude ?? null,
    })
    .select("id")
    .single();

  if (createError) {
    console.error(`[findOrCreateClinic] Failed to create clinic ${trimmedName}:`, createError.message);
    return null;
  }

  return created.id;
}

/**
 * Resolves a speciality name to its database UUID.
 */
export async function resolveSpecialityId(specialityName: string): Promise<string | null> {
  const trimmed = specialityName.trim();
  const { data, error } = await supabase
    .from("specialities")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();

  if (error || !data) {
    // Try matching slug
    const { data: slugData } = await supabase
      .from("specialities")
      .select("id")
      .ilike("slug", trimmed.toLowerCase())
      .maybeSingle();

    return slugData?.id || null;
  }

  return data.id;
}

/**
 * Imports a single verified doctor record.
 * Strictly forces verification_status = "pending".
 * Enforces duplicate detection and preserves provenance source.
 */
export async function importDoctorRecord(
  record: RawDoctorRecord
): Promise<{ success: boolean; id?: string; error?: string; skippedDuplicate?: boolean }> {
  // 1. Validate
  const validation = validateDoctorRecord(record);
  if (!validation.valid) {
    const msg = validation.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    return { success: false, error: msg };
  }

  // 2. Resolve Speciality ID
  const specialityId = await resolveSpecialityId(record.speciality);
  if (!specialityId) {
    return {
      success: false,
      error: `Could not resolve database speciality for '${record.speciality}'. Ensure Phase 3 schema is seeded.`,
    };
  }

  // 3. Resolve or create Clinic ID if clinic specified
  let clinicId: string | null = null;
  if (record.clinic && record.clinic.trim()) {
    clinicId = await findOrCreateClinic(record.clinic, {
      address: record.address,
      city: record.city,
      state: record.state,
      phone: record.phone,
      website: record.website,
      source: record.source,
    });
  }

  // 4. Duplicate Check: Search existing doctors with identical profile name & speciality
  // Check if doctor with same profile name exists in this speciality
  const { data: existingDoctors, error: checkError } = await supabase
    .from("doctors")
    .select(`
      id,
      speciality_id,
      profiles!doctors_profile_id_fkey(full_name)
    `)
    .eq("speciality_id", specialityId);

  if (!checkError && existingDoctors) {
    const isDuplicate = existingDoctors.some((doc) => {
      const p = doc.profiles as unknown as { full_name?: string } | null;
      return (
        p?.full_name?.trim().toLowerCase() === record.name.trim().toLowerCase()
      );
    });

    if (isDuplicate) {
      return {
        success: false,
        skippedDuplicate: true,
        error: `Duplicate doctor detected: '${record.name}' is already registered in speciality '${record.speciality}'.`,
      };
    }
  }

  // 5. Profile ID resolution or check
  let profileId = record.profile_id;
  if (!profileId) {
    // Check if an existing profile exists with this exact full_name and role='doctor'
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", record.name.trim())
      .eq("role", "doctor")
      .maybeSingle();

    profileId = profileData?.id || null;
  }

  if (!profileId) {
    return {
      success: false,
      error: `No linked doctor profile found for '${record.name}'. Doctor accounts must have an associated Supabase profile. Provide 'profile_id' or ensure the doctor profile is registered prior to import.`,
    };
  }

  // 6. Check if doctor row already exists for this profile_id (unique constraint)
  const { data: docWithProfile } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (docWithProfile) {
    return {
      success: false,
      skippedDuplicate: true,
      error: `A doctor record already exists for profile_id '${profileId}'.`,
    };
  }

  // 7. Preserve source inside about section and strictly set verification_status to 'pending'
  const sourceAnnotation = `\n\n[Import Provenance: ${record.source.trim()}]`;
  const documentedAbout = record.about
    ? `${record.about.trim()}${sourceAnnotation}`
    : `[Import Provenance: ${record.source.trim()}]`;

  // Always force pending verification status — never automatically verified
  const initialStatus: DoctorVerificationStatus = "pending";

  const { data: inserted, error: insertError } = await supabase
    .from("doctors")
    .insert({
      profile_id: profileId,
      speciality_id: specialityId,
      clinic_id: clinicId,
      qualification: record.qualification?.trim() || null,
      experience_years: record.experience_years ?? null,
      consultation_fee: record.consultation_fee ?? null,
      about: documentedAbout,
      verification_status: initialStatus,
    })
    .select("id")
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, id: inserted.id };
}

/**
 * Batch imports an array of verified doctor records.
 */
export async function importDoctorRecords(
  records: RawDoctorRecord[]
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: records.length,
    imported: 0,
    skippedDuplicates: 0,
    failedValidation: 0,
    errors: [],
  };

  for (const record of records) {
    const result = await importDoctorRecord(record);
    if (result.success) {
      summary.imported++;
    } else if (result.skippedDuplicate) {
      summary.skippedDuplicates++;
      summary.errors.push({
        identifier: record.name,
        reason: result.error || "Duplicate skipped",
      });
    } else {
      summary.failedValidation++;
      summary.errors.push({
        identifier: record.name,
        reason: result.error || "Unknown validation error",
      });
    }
  }

  return summary;
}

/**
 * Imports a single verified clinic record.
 * Checks for duplicates by clinic name and city.
 * Preserves source provenance.
 */
export async function importClinicRecord(
  record: RawClinicRecord
): Promise<{ success: boolean; id?: string; error?: string; skippedDuplicate?: boolean }> {
  const validation = validateClinicRecord(record);
  if (!validation.valid) {
    const msg = validation.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    return { success: false, error: msg };
  }

  const trimmedName = record.name.trim();
  const city = record.city?.trim() || "Bhopal";

  // Check if clinic already exists
  const { data: existing, error: findError } = await supabase
    .from("clinics")
    .select("id")
    .ilike("name", trimmedName)
    .ilike("city", city)
    .maybeSingle();

  if (!findError && existing?.id) {
    return {
      success: false,
      skippedDuplicate: true,
      error: `Duplicate clinic detected: '${trimmedName}' in '${city}' already exists.`,
    };
  }

  const { data: created, error: createError } = await supabase
    .from("clinics")
    .insert({
      name: trimmedName,
      address: record.address?.trim() || null,
      city: city,
      state: record.state?.trim() || "Madhya Pradesh",
      pincode: record.pincode?.trim() || null,
      phone: record.phone?.trim() || null,
      website: record.website?.trim() || null,
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
    })
    .select("id")
    .single();

  if (createError) {
    return { success: false, error: createError.message };
  }

  return { success: true, id: created.id };
}

/**
 * Batch imports an array of verified clinic records.
 */
export async function importClinicRecords(
  records: RawClinicRecord[]
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: records.length,
    imported: 0,
    skippedDuplicates: 0,
    failedValidation: 0,
    errors: [],
  };

  for (const record of records) {
    const result = await importClinicRecord(record);
    if (result.success) {
      summary.imported++;
    } else if (result.skippedDuplicate) {
      summary.skippedDuplicates++;
      summary.errors.push({
        identifier: record.name,
        reason: result.error || "Duplicate skipped",
      });
    } else {
      summary.failedValidation++;
      summary.errors.push({
        identifier: record.name,
        reason: result.error || "Unknown validation error",
      });
    }
  }

  return summary;
}

