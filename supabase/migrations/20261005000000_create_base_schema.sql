-- ==============================================================================
-- Migration: 20261005000000_create_base_schema.sql
-- Description: Base database schema for MediSphere Phase 3
-- Tables: profiles, specialities, clinics, doctors
-- ==============================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE 1: PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TABLE 2: SPECIALITIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.specialities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TABLE 3: CLINICS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Bhopal',
  state TEXT DEFAULT 'Madhya Pradesh',
  pincode TEXT,
  phone TEXT,
  website TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TABLE 4: DOCTORS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  speciality_id UUID REFERENCES public.specialities(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  qualification TEXT,
  experience_years INTEGER CHECK (experience_years >= 0),
  consultation_fee NUMERIC CHECK (consultation_fee >= 0),
  about TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'verified', 'rejected', 'suspended')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_doctor_profile UNIQUE (profile_id)
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_doctors_speciality_id ON public.doctors(speciality_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON public.doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_profile_id ON public.doctors(profile_id);
CREATE INDEX IF NOT EXISTS idx_doctors_verification_status ON public.doctors(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_specialities_slug ON public.specialities(slug);

-- ==============================================================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clinics_updated_at ON public.clinics;
CREATE TRIGGER set_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_doctors_updated_at ON public.doctors;
CREATE TRIGGER set_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- SEED DATA: 6 SPECIALITIES ONLY
-- ==============================================================================
INSERT INTO public.specialities (name, slug, description)
VALUES
  ('Dermatology', 'dermatology', 'Skin, hair, and nail health including acne, allergies, and dermatological care.'),
  ('ENT', 'ent', 'Comprehensive ear, nose, throat, sinus, and hearing evaluation and treatments.'),
  ('Dentistry', 'dentistry', 'Oral checkups, cavity treatments, teeth cleaning, and dental procedures.'),
  ('Cardiology', 'cardiology', 'Cardiovascular health, ECG monitoring, heart assessments, and blood pressure care.'),
  ('Neurology', 'neurology', 'Nerve, spine, and brain consultations for persistent headaches and neurological health.'),
  ('Orthopedics', 'orthopedics', 'Bone health, joint pain relief, spine issues, fractures, and mobility therapy.')
ON CONFLICT (name) DO UPDATE SET
  slug = EXCLUDED.slug,
  description = EXCLUDED.description;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- specialities
CREATE POLICY "Allow public read access on specialities"
  ON public.specialities FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access on specialities"
  ON public.specialities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- clinics
CREATE POLICY "Allow public read access on clinics"
  ON public.clinics FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access on clinics"
  ON public.clinics FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- profiles
CREATE POLICY "Allow users to view own profile or doctor profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR role = 'doctor'
    OR public.is_admin()
  );

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      OR public.is_admin()
    )
  );

CREATE POLICY "Allow admin full access on profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- doctors
CREATE POLICY "Allow public read of verified doctors"
  ON public.doctors FOR SELECT
  USING (
    verification_status = 'verified'
    OR profile_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Allow doctor to insert own record"
  ON public.doctors FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

CREATE POLICY "Allow doctor to update own record"
  ON public.doctors FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND (
      verification_status = (SELECT verification_status FROM public.doctors WHERE profile_id = auth.uid())
      OR public.is_admin()
    )
  );

CREATE POLICY "Allow admin full access on doctors"
  ON public.doctors FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
