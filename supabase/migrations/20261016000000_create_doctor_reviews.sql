-- ==============================================================================
-- Migration: 20261016000000_create_doctor_reviews.sql
-- Description: Doctor reviews & ratings schema, constraints, RLS, and RPCs
-- ==============================================================================

-- 1. Create doctor_reviews table
CREATE TABLE IF NOT EXISTS public.doctor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Rating must strictly be an integer from 1 to 5
  CONSTRAINT doctor_reviews_rating_check CHECK (rating >= 1 AND rating <= 5),

  -- Reasonable review text length limit (max 1000 characters)
  CONSTRAINT doctor_reviews_review_text_check CHECK (review_text IS NULL OR length(review_text) <= 1000),

  -- Exactly one review per appointment (prevents duplicates)
  CONSTRAINT doctor_reviews_appointment_id_key UNIQUE (appointment_id)
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON public.doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_patient_id ON public.doctor_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_appointment_id ON public.doctor_reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_created_at ON public.doctor_reviews(created_at DESC);

-- 3. Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_doctor_reviews_updated_at ON public.doctor_reviews;
CREATE TRIGGER set_doctor_reviews_updated_at
  BEFORE UPDATE ON public.doctor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Database-level validation trigger:
-- Enforces:
-- - Rating must be between 1 and 5
-- - Review text length limit
-- - Appointment existence
-- - Appointment must belong to reviewing patient
-- - Appointment must belong to reviewed doctor
-- - Only completed appointments can be reviewed
-- - On update: doctor_id, patient_id, and appointment_id cannot be changed
CREATE OR REPLACE FUNCTION public.validate_doctor_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appt RECORD;
BEGIN
  -- 1. Validate rating bounds
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'INVALID_RATING: Rating must be an integer between 1 and 5.';
  END IF;

  -- 2. Validate review text length
  IF NEW.review_text IS NOT NULL AND length(NEW.review_text) > 1000 THEN
    RAISE EXCEPTION 'REVIEW_TOO_LONG: Review text cannot exceed 1000 characters.';
  END IF;

  -- 3. Immutability on UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF OLD.doctor_id != NEW.doctor_id OR OLD.patient_id != NEW.patient_id OR OLD.appointment_id != NEW.appointment_id THEN
      RAISE EXCEPTION 'IMMUTABLE_FIELDS: doctor_id, patient_id, and appointment_id cannot be modified.';
    END IF;
  END IF;

  -- 4. Verify referenced appointment
  SELECT id, patient_id, doctor_id, status
  INTO v_appt
  FROM public.appointments
  WHERE id = NEW.appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND: The referenced appointment does not exist.';
  END IF;

  IF v_appt.patient_id != NEW.patient_id THEN
    RAISE EXCEPTION 'PATIENT_MISMATCH: You can only review appointments that belong to your account.';
  END IF;

  IF v_appt.doctor_id != NEW.doctor_id THEN
    RAISE EXCEPTION 'DOCTOR_MISMATCH: The reviewed doctor does not match the appointment doctor.';
  END IF;

  IF v_appt.status != 'completed' THEN
    RAISE EXCEPTION 'INELIGIBLE_APPOINTMENT: Only completed appointments can receive reviews. Current status: %', v_appt.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_doctor_review ON public.doctor_reviews;
CREATE TRIGGER trg_validate_doctor_review
  BEFORE INSERT OR UPDATE ON public.doctor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_doctor_review();

-- 5. Row Level Security Policies
ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;

-- Public read access: Anyone can read published reviews
DROP POLICY IF EXISTS "Allow public read access to doctor_reviews" ON public.doctor_reviews;
CREATE POLICY "Allow public read access to doctor_reviews"
  ON public.doctor_reviews FOR SELECT
  USING (true);

-- Authenticated patient insert: Patient can only submit reviews for their own completed appointments
DROP POLICY IF EXISTS "Allow authenticated patients to insert own review" ON public.doctor_reviews;
CREATE POLICY "Allow authenticated patients to insert own review"
  ON public.doctor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = patient_id
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND a.patient_id = auth.uid()
        AND a.doctor_id = doctor_reviews.doctor_id
        AND a.status = 'completed'
    )
  );

-- Authenticated patient update: Patient can only update their own review rating and text
DROP POLICY IF EXISTS "Allow patients to update own review" ON public.doctor_reviews;
CREATE POLICY "Allow patients to update own review"
  ON public.doctor_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Note: Doctors cannot delete or edit reviews. No DELETE policy is provided for doctors.

-- 6. Privacy-Safe Public View
-- Exposes only intended review fields and a sanitized reviewer display name.
-- Strictly omits patient email, phone, full profile record, and appointment notes.
CREATE OR REPLACE VIEW public.doctor_public_reviews AS
SELECT
  r.id,
  r.doctor_id,
  r.rating,
  r.review_text,
  r.created_at,
  r.updated_at,
  COALESCE(
    NULLIF(split_part(p.full_name, ' ', 1), ''),
    'Verified Patient'
  ) AS patient_display_name
FROM public.doctor_reviews r
LEFT JOIN public.profiles p ON p.id = r.patient_id;

-- 7. Stored Procedure: submit_doctor_review
-- Server-side atomic submission that automatically derives patient_id from auth.uid()
-- and doctor_id from the verified completed appointment.
CREATE OR REPLACE FUNCTION public.submit_doctor_review(
  p_appointment_id UUID,
  p_rating INTEGER,
  p_review_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_appt RECORD;
  v_new_review RECORD;
BEGIN
  -- 1. Identify caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Authentication required to submit a doctor review.';
  END IF;

  -- 2. Validate rating bounds
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'INVALID_RATING: Rating must be an integer between 1 and 5.';
  END IF;

  -- 3. Validate text length
  IF p_review_text IS NOT NULL AND length(p_review_text) > 1000 THEN
    RAISE EXCEPTION 'REVIEW_TOO_LONG: Review text cannot exceed 1000 characters.';
  END IF;

  -- 4. Check appointment eligibility
  SELECT id, patient_id, doctor_id, status
  INTO v_appt
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND: Appointment could not be found.';
  END IF;

  IF v_appt.patient_id != v_caller_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You can only review consultations booked under your account.';
  END IF;

  IF v_appt.status != 'completed' THEN
    RAISE EXCEPTION 'INELIGIBLE_APPOINTMENT: Only completed appointments can receive reviews. Current status: %', v_appt.status;
  END IF;

  -- 5. Check if review already exists for this appointment
  IF EXISTS (SELECT 1 FROM public.doctor_reviews WHERE appointment_id = p_appointment_id) THEN
    RAISE EXCEPTION 'DUPLICATE_REVIEW: A review has already been submitted for this appointment.';
  END IF;

  -- 6. Insert review
  INSERT INTO public.doctor_reviews (
    doctor_id,
    patient_id,
    appointment_id,
    rating,
    review_text
  )
  VALUES (
    v_appt.doctor_id,
    v_caller_id,
    p_appointment_id,
    p_rating,
    NULLIF(trim(p_review_text), '')
  )
  RETURNING * INTO v_new_review;

  RETURN jsonb_build_object(
    'id', v_new_review.id,
    'doctor_id', v_new_review.doctor_id,
    'patient_id', v_new_review.patient_id,
    'appointment_id', v_new_review.appointment_id,
    'rating', v_new_review.rating,
    'review_text', v_new_review.review_text,
    'created_at', v_new_review.created_at,
    'updated_at', v_new_review.updated_at
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_doctor_review(UUID, INTEGER, TEXT) TO authenticated;

-- 8. Stored Procedure: get_doctor_rating_stats
-- Computes real, non-fabricated average rating and distribution for a doctor
CREATE OR REPLACE FUNCTION public.get_doctor_rating_stats(
  p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_avg NUMERIC;
  v_r1 INTEGER;
  v_r2 INTEGER;
  v_r3 INTEGER;
  v_r4 INTEGER;
  v_r5 INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(ROUND(AVG(rating)::numeric, 1), NULL),
    COUNT(*) FILTER (WHERE rating = 1),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 5)
  INTO
    v_total,
    v_avg,
    v_r1,
    v_r2,
    v_r3,
    v_r4,
    v_r5
  FROM public.doctor_reviews
  WHERE doctor_id = p_doctor_id;

  RETURN jsonb_build_object(
    'total_reviews', v_total,
    'average_rating', v_avg,
    'distribution', jsonb_build_object(
      '1', v_r1,
      '2', v_r2,
      '3', v_r3,
      '4', v_r4,
      '5', v_r5
    )
  );
END;
$$;

-- Grant execution to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_doctor_rating_stats(UUID) TO anon, authenticated;
