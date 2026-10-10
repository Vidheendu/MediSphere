-- ==============================================================================
-- MEDISPHERE - PHASE 3 BASIC DATABASE SCHEMA
-- Tables: profiles, specialities, clinics, doctors
-- ==============================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE 1: PROFILES
-- Connected to Supabase auth.users
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
-- Core medical specialties in Bhopal
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
-- Physical clinics and healthcare centers
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
-- Medical practitioners linked to profile, speciality, and clinic
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
-- Optimizing doctor discovery and relational lookups
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

-- ------------------------------------------------------------------------------
-- Trigger to automatically create a profile record when a new user signs up
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, location, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    'patient' -- Strictly enforce patient role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    location = EXCLUDED.location;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- SEED DATA: INSERT ONLY THE 6 SPECIALITIES (NO FAKE DOCTORS/CLINICS)
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
-- Strict access control: No public write access
-- ==============================================================================

-- Enable RLS on all 4 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- POLICIES: specialities
-- ------------------------------------------------------------------------------
-- Public can read specialties
CREATE POLICY "Allow public read access on specialities"
  ON public.specialities FOR SELECT
  USING (true);

-- Only admins can modify specialties
CREATE POLICY "Allow admin full access on specialities"
  ON public.specialities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- POLICIES: clinics
-- ------------------------------------------------------------------------------
-- Public can read clinics
CREATE POLICY "Allow public read access on clinics"
  ON public.clinics FOR SELECT
  USING (true);

-- Only admins can manage clinics
CREATE POLICY "Allow admin full access on clinics"
  ON public.clinics FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- POLICIES: profiles
-- ------------------------------------------------------------------------------
-- Users can view their own profile, or view doctor profiles for discovery
CREATE POLICY "Allow users to view own profile or doctor profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR role = 'doctor'
    OR public.is_admin()
  );

-- Users can insert their own profile with role = 'patient'
CREATE POLICY "Allow users to insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'patient'
  );

-- Users can update only their own profile
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

-- Admins have full access to profiles
CREATE POLICY "Allow admin full access on profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- POLICIES: doctors
-- ------------------------------------------------------------------------------
-- Public can view verified doctors; unverified can be viewed only by owner or admin
CREATE POLICY "Allow public read of verified doctors"
  ON public.doctors FOR SELECT
  USING (
    verification_status = 'verified'
    OR profile_id = auth.uid()
    OR public.is_admin()
  );

-- Doctors can register their own record
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

-- Doctors can update only their own record (cannot self-verify)
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

-- Admins have full management access on doctors (verify, suspend, etc.)
CREATE POLICY "Allow admin full access on doctors"
  ON public.doctors FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- TABLE 5: DOCTOR SCHEDULES (PHASE 10)
-- Doctor working days, recurring hours, breaks, and slot durations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (
    day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  appointment_duration INTEGER NOT NULL DEFAULT 30 CHECK (appointment_duration > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_doctor_schedule_day UNIQUE (doctor_id, day_of_week),
  CONSTRAINT check_schedule_times CHECK (end_time > start_time),
  CONSTRAINT check_schedule_break CHECK (
    (break_start IS NULL AND break_end IS NULL) OR
    (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start AND break_start >= start_time AND break_end <= end_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON public.doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_active ON public.doctor_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_lookup ON public.doctor_schedules(doctor_id, day_of_week, is_active);

DROP TRIGGER IF EXISTS set_doctor_schedules_updated_at ON public.doctor_schedules;
CREATE TRIGGER set_doctor_schedules_updated_at
  BEFORE UPDATE ON public.doctor_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Public/Patients can read active schedules of verified doctors; Doctors can read their own
CREATE POLICY "Allow public read of active verified doctor schedules"
  ON public.doctor_schedules FOR SELECT
  USING (
    (
      is_active = true
      AND EXISTS (
        SELECT 1 FROM public.doctors
        WHERE doctors.id = doctor_schedules.doctor_id
          AND doctors.verification_status = 'verified'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = doctor_schedules.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 2. INSERT: Doctor can insert own schedule only
CREATE POLICY "Allow doctor to insert own schedule"
  ON public.doctor_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = doctor_schedules.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 3. UPDATE: Doctor can update own schedule only
CREATE POLICY "Allow doctor to update own schedule"
  ON public.doctor_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = doctor_schedules.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = doctor_schedules.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 4. DELETE: Doctor can delete own schedule only
CREATE POLICY "Allow doctor to delete own schedule"
  ON public.doctor_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = doctor_schedules.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ==============================================================================
-- TABLE 6: APPOINTMENT SLOTS (PHASE 11)
-- Date-specific appointment slots derived from doctor schedules
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, slot_date, start_time),
  CONSTRAINT check_slot_times CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointment_slots_doctor_date ON public.appointment_slots(doctor_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_status ON public.appointment_slots(status);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_lookup ON public.appointment_slots(doctor_id, slot_date, status);

DROP TRIGGER IF EXISTS set_appointment_slots_updated_at ON public.appointment_slots;
CREATE TRIGGER set_appointment_slots_updated_at
  BEFORE UPDATE ON public.appointment_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Public/Patients can read available slots of verified doctors; Doctors can read their own
CREATE POLICY "Allow public read of available verified doctor slots"
  ON public.appointment_slots FOR SELECT
  USING (
    (
      status = 'available'
      AND EXISTS (
        SELECT 1 FROM public.doctors
        WHERE doctors.id = appointment_slots.doctor_id
          AND doctors.verification_status = 'verified'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointment_slots.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 2. INSERT: Doctor can insert own slots only
CREATE POLICY "Allow doctor to insert own slots"
  ON public.appointment_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointment_slots.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 3. UPDATE: Doctor can update (block/unblock) own slots only; cannot manually mark as booked
CREATE POLICY "Allow doctor to update own slots"
  ON public.appointment_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointment_slots.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.doctors
        WHERE doctors.id = appointment_slots.doctor_id
          AND doctors.profile_id = auth.uid()
      )
      AND status IN ('available', 'blocked')
    )
    OR public.is_admin()
  );

-- 4. DELETE: Doctor can delete own unbooked slots
CREATE POLICY "Allow doctor to delete own unbooked slots"
  ON public.appointment_slots FOR DELETE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.doctors
        WHERE doctors.id = appointment_slots.doctor_id
          AND doctors.profile_id = auth.uid()
      )
      AND status != 'booked'
    )
    OR public.is_admin()
  );

-- ==============================================================================
-- TABLE 7: APPOINTMENTS (PHASE 12)
-- Patient appointment booking with atomic double-booking protection
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.appointment_slots(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('confirmed', 'cancelled', 'completed', 'no_show')
  ),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_appointment_slot UNIQUE (slot_id)
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_id ON public.appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_lookup ON public.appointments(patient_id, appointment_date, status);

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow patient to view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointments.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Allow admin direct insert on appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Allow admin update on appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_slot_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_patient_role TEXT;
  v_slot RECORD;
  v_doctor RECORD;
  v_appointment RECORD;
  v_now_ist TIMESTAMP;
  v_slot_timestamp TIMESTAMP;
BEGIN
  -- 1. Identify caller via auth.uid()
  v_patient_id := auth.uid();
  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Authentication required to book an appointment.';
  END IF;

  -- Verify user is registered with patient role
  SELECT role INTO v_patient_role
  FROM public.profiles
  WHERE id = v_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PATIENT_NOT_FOUND: User profile does not exist.';
  END IF;

  IF v_patient_role != 'patient' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'INVALID_ROLE: Only registered patient accounts can book appointments.';
  END IF;

  -- 2. Lock the requested appointment slot with row-level lock (FOR UPDATE)
  SELECT *
  INTO v_slot
  FROM public.appointment_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  -- 3. Verify slot exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_FOUND: Appointment slot not found.';
  END IF;

  -- 4. Verify slot status is available
  IF v_slot.status = 'booked' THEN
    RAISE EXCEPTION 'SLOT_ALREADY_BOOKED: This appointment slot is already booked.';
  ELSIF v_slot.status = 'blocked' THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: This appointment slot has been blocked by the practitioner.';
  ELSIF v_slot.status != 'available' THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE: This appointment slot is not available for booking.';
  END IF;

  -- 5. Verify slot is not in the past using Asia/Kolkata timezone
  v_now_ist := (now() AT TIME ZONE 'Asia/Kolkata');
  v_slot_timestamp := (v_slot.slot_date + v_slot.start_time);

  IF v_slot_timestamp <= v_now_ist THEN
    RAISE EXCEPTION 'SLOT_EXPIRED: Cannot book an appointment for a past date or time.';
  END IF;

  -- 6. Verify doctor exists and is verified
  SELECT *
  INTO v_doctor
  FROM public.doctors
  WHERE id = v_slot.doctor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DOCTOR_NOT_FOUND: The requested doctor record does not exist.';
  END IF;

  IF v_doctor.verification_status != 'verified' THEN
    RAISE EXCEPTION 'DOCTOR_NOT_VERIFIED: Appointments can only be booked with verified practitioners.';
  END IF;

  -- 7. Insert appointment record atomically
  INSERT INTO public.appointments (
    patient_id,
    doctor_id,
    slot_id,
    appointment_date,
    start_time,
    end_time,
    status,
    reason,
    notes
  ) VALUES (
    v_patient_id,
    v_slot.doctor_id,
    v_slot.id,
    v_slot.slot_date,
    v_slot.start_time,
    v_slot.end_time,
    'confirmed',
    NULLIF(TRIM(p_reason), ''),
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING * INTO v_appointment;

  -- 8. Update slot status to booked
  UPDATE public.appointment_slots
  SET status = 'booked'
  WHERE id = v_slot.id;

  -- 9. Return JSON representation of confirmed appointment
  RETURN jsonb_build_object(
    'id', v_appointment.id,
    'patient_id', v_appointment.patient_id,
    'doctor_id', v_appointment.doctor_id,
    'slot_id', v_appointment.slot_id,
    'appointment_date', v_appointment.appointment_date,
    'start_time', v_appointment.start_time,
    'end_time', v_appointment.end_time,
    'status', v_appointment.status,
    'reason', v_appointment.reason,
    'notes', v_appointment.notes,
    'created_at', v_appointment.created_at,
    'updated_at', v_appointment.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_appointment(UUID, TEXT, TEXT) TO authenticated;



