import { supabase } from "@/lib/supabase";
import type { Speciality } from "@/types";

/**
 * Phase 3 Canonical Specialities Reference Dataset for Bhopal
 */
export const CANONICAL_SPECIALITIES: Speciality[] = [
  {
    id: "spec-dermatology",
    name: "Dermatology",
    slug: "dermatology",
    description: "Skin, hair, and nail health including acne, allergies, and dermatological care.",
    created_at: new Date().toISOString(),
  },
  {
    id: "spec-ent",
    name: "ENT",
    slug: "ent",
    description: "Comprehensive ear, nose, throat, sinus, and hearing evaluation and treatments.",
    created_at: new Date().toISOString(),
  },
  {
    id: "spec-dentistry",
    name: "Dentistry",
    slug: "dentistry",
    description: "Oral checkups, cavity treatments, teeth cleaning, and dental procedures.",
    created_at: new Date().toISOString(),
  },
  {
    id: "spec-cardiology",
    name: "Cardiology",
    slug: "cardiology",
    description: "Cardiovascular health, ECG monitoring, heart assessments, and blood pressure care.",
    created_at: new Date().toISOString(),
  },
  {
    id: "spec-neurology",
    name: "Neurology",
    slug: "neurology",
    description: "Nerve, spine, and brain consultations for persistent headaches and neurological health.",
    created_at: new Date().toISOString(),
  },
  {
    id: "spec-orthopedics",
    name: "Orthopedics",
    slug: "orthopedics",
    description: "Bone health, joint pain relief, spine issues, fractures, and mobility therapy.",
    created_at: new Date().toISOString(),
  },
];

/**
 * Retrieves all medical specialities from Supabase.
 * Returns records ordered alphabetically by name.
 */
export async function getSpecialities(): Promise<Speciality[]> {
  try {
    const { data, error } = await supabase
      .from("specialities")
      .select("id, name, slug, description, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.warn("[getSpecialities] Supabase query notice:", error.message);
      return CANONICAL_SPECIALITIES;
    }

    if (data && data.length > 0) {
      return data as Speciality[];
    }

    return CANONICAL_SPECIALITIES;
  } catch (err) {
    console.warn("[getSpecialities] Using canonical specialities fallback:", err);
    return CANONICAL_SPECIALITIES;
  }
}

/**
 * Retrieves a single medical speciality by its slug (e.g. 'cardiology', 'dermatology').
 */
export async function getSpecialityBySlug(slug: string): Promise<Speciality | null> {
  if (!slug) return null;
  const normalizedSlug = slug.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from("specialities")
      .select("id, name, slug, description, created_at")
      .ilike("slug", normalizedSlug)
      .maybeSingle();

    if (!error && data) {
      return data as Speciality;
    }

    // Try name match if slug match wasn't direct
    const { data: nameMatch } = await supabase
      .from("specialities")
      .select("id, name, slug, description, created_at")
      .ilike("name", normalizedSlug)
      .maybeSingle();

    if (nameMatch) {
      return nameMatch as Speciality;
    }

    // Fallback to canonical reference
    const canonical = CANONICAL_SPECIALITIES.find(
      (s) => s.slug === normalizedSlug || s.name.toLowerCase() === normalizedSlug
    );
    return canonical || null;
  } catch {
    const canonical = CANONICAL_SPECIALITIES.find(
      (s) => s.slug === normalizedSlug || s.name.toLowerCase() === normalizedSlug
    );
    return canonical || null;
  }
}
