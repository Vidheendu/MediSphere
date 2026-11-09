-- ==============================================================================
-- MEDISPHERE - PHASE 20: ADMIN PANEL, SECURITY AUDIT & DEPLOYMENT READINESS
-- Migration: 20261025000000_admin_and_security.sql
-- ==============================================================================

-- 1. Extend doctors table for rejection tracking and audit timestamp
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 2. Add Row Level Security policies for administrator review management
DROP POLICY IF EXISTS "Allow admin full access on doctor_reviews" ON public.doctor_reviews;
CREATE POLICY "Allow admin full access on doctor_reviews"
  ON public.doctor_reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Stored Procedure: Admin Doctor Verification & Status Management
CREATE OR REPLACE FUNCTION public.admin_update_doctor_status(
  p_doctor_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_doc RECORD;
  v_verified_at TIMESTAMPTZ;
  v_doctor_name TEXT;
BEGIN
  -- 1. Authorize caller is strictly an admin
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Authentication required for administration.';
  END IF;

  v_is_admin := public.is_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Administrator privileges required.';
  END IF;

  -- 2. Validate requested status transition
  IF p_status NOT IN ('pending', 'verified', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Verification status must be one of: pending, verified, rejected, suspended.';
  END IF;

  -- 3. Fetch doctor record
  SELECT d.*, p.full_name INTO v_doc
  FROM public.doctors d
  JOIN public.profiles p ON p.id = d.profile_id
  WHERE d.id = p_doctor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DOCTOR_NOT_FOUND: Doctor record does not exist.';
  END IF;

  -- Compute verified_at timestamp
  IF p_status = 'verified' THEN
    v_verified_at := timezone('utc'::text, now());
  ELSE
    v_verified_at := NULL;
  END IF;

  -- 4. Update doctor record
  UPDATE public.doctors
  SET
    verification_status = p_status,
    rejection_reason = CASE
      WHEN p_status = 'rejected' THEN NULLIF(TRIM(p_reason), '')
      WHEN p_status = 'verified' THEN NULL
      ELSE rejection_reason
    END,
    verified_at = v_verified_at,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_doctor_id;

  -- 5. Send notification to doctor regarding status update
  IF p_status = 'verified' THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      title,
      message
    ) VALUES (
      v_doc.profile_id,
      'system',
      'Doctor Profile Verified',
      'Congratulations Dr. ' || COALESCE(v_doc.full_name, 'Practitioner') || '! Your MediSphere practitioner profile has been verified. Your public profile and appointment booking are now active.'
    );
  ELSIF p_status = 'rejected' THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      title,
      message
    ) VALUES (
      v_doc.profile_id,
      'system',
      'Doctor Verification Update',
      'Your MediSphere practitioner application could not be verified at this time.' ||
      CASE WHEN p_reason IS NOT NULL AND TRIM(p_reason) != '' THEN ' Reason: ' || TRIM(p_reason) ELSE '' END
    );
  END IF;

  RETURN jsonb_build_object(
    'id', p_doctor_id,
    'verification_status', p_status,
    'rejection_reason', CASE WHEN p_status = 'rejected' THEN TRIM(p_reason) ELSE NULL END,
    'verified_at', v_verified_at,
    'updated_at', timezone('utc'::text, now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_doctor_status(UUID, TEXT, TEXT) TO authenticated;

-- 4. Stored Procedure: Admin Dashboard Real-Time Statistics (Asia/Kolkata)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_total_doctors INTEGER;
  v_pending_doctors INTEGER;
  v_verified_doctors INTEGER;
  v_rejected_doctors INTEGER;
  v_suspended_doctors INTEGER;
  v_total_clinics INTEGER;
  v_total_appointments INTEGER;
  v_upcoming_appointments INTEGER;
  v_total_users INTEGER;
  v_total_reviews INTEGER;
  v_current_date_ist DATE;
  v_current_time_ist TIME;
BEGIN
  -- 1. Authorize caller is strictly an admin
  v_is_admin := public.is_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Administrator privileges required to access statistics.';
  END IF;

  -- 2. Compute current IST date and time
  v_current_date_ist := (timezone('Asia/Kolkata', now()))::date;
  v_current_time_ist := (timezone('Asia/Kolkata', now()))::time;

  -- 3. Doctor counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE verification_status = 'pending'),
    COUNT(*) FILTER (WHERE verification_status = 'verified'),
    COUNT(*) FILTER (WHERE verification_status = 'rejected'),
    COUNT(*) FILTER (WHERE verification_status = 'suspended')
  INTO
    v_total_doctors,
    v_pending_doctors,
    v_verified_doctors,
    v_rejected_doctors,
    v_suspended_doctors
  FROM public.doctors;

  -- 4. Clinic counts
  SELECT COUNT(*) INTO v_total_clinics FROM public.clinics;

  -- 5. Appointments counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE status = 'confirmed'
        AND (
          appointment_date > v_current_date_ist
          OR (appointment_date = v_current_date_ist AND start_time >= v_current_time_ist)
        )
    )
  INTO
    v_total_appointments,
    v_upcoming_appointments
  FROM public.appointments;

  -- 6. User counts
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;

  -- 7. Review counts
  SELECT COUNT(*) INTO v_total_reviews FROM public.doctor_reviews;

  RETURN jsonb_build_object(
    'total_doctors', COALESCE(v_total_doctors, 0),
    'pending_doctors', COALESCE(v_pending_doctors, 0),
    'verified_doctors', COALESCE(v_verified_doctors, 0),
    'rejected_doctors', COALESCE(v_rejected_doctors, 0),
    'suspended_doctors', COALESCE(v_suspended_doctors, 0),
    'total_clinics', COALESCE(v_total_clinics, 0),
    'total_appointments', COALESCE(v_total_appointments, 0),
    'upcoming_appointments', COALESCE(v_upcoming_appointments, 0),
    'total_users', COALESCE(v_total_users, 0),
    'total_reviews', COALESCE(v_total_reviews, 0),
    'timezone', 'Asia/Kolkata',
    'generated_at', timezone('utc'::text, now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

