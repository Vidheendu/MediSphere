-- ==============================================================================
-- Migration: 20261014000000_doctor_appointments.sql
-- Description: Doctor appointment management, RLS policies, and status update RPC
-- ==============================================================================

-- 1. RLS Policy on profiles: Allow doctors to view profile fields of patients
-- who have booked appointments with their verified doctor profile.
DROP POLICY IF EXISTS "Allow doctors to view patient profiles for own appointments" ON public.profiles;
CREATE POLICY "Allow doctors to view patient profiles for own appointments"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      JOIN public.doctors ON doctors.id = appointments.doctor_id
      WHERE appointments.patient_id = profiles.id
        AND doctors.profile_id = auth.uid()
    )
  );

-- 2. RLS Policy on appointments: Allow doctors to update status of their own appointments
DROP POLICY IF EXISTS "Allow doctors to update own appointment status" ON public.appointments;
CREATE POLICY "Allow doctors to update own appointment status"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointments.doctor_id
        AND doctors.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointments.doctor_id
        AND doctors.profile_id = auth.uid()
    )
    AND status IN ('completed', 'no_show')
  );

-- 3. Stored Procedure: update_doctor_appointment_status
-- Enforces server/database side authorization and validation:
-- - Only the doctor associated with the appointment can update status
-- - Patients cannot perform this doctor-only operation
-- - Status must be strictly 'completed' or 'no_show'
-- - Future appointments cannot be marked completed
-- - Cancelled appointments cannot transition to completed or no_show
-- - Modifies only status and updated_at; preserves dates, times, patient_id, doctor_id, slot_id
CREATE OR REPLACE FUNCTION public.update_doctor_appointment_status(
  p_appointment_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_doctor_id UUID;
  v_appointment RECORD;
  v_now_ist TIMESTAMP;
  v_appt_start TIMESTAMP;
BEGIN
  -- 1. Identify caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Authentication required to update appointment status.';
  END IF;

  -- 2. Verify caller is a doctor
  SELECT id INTO v_doctor_id
  FROM public.doctors
  WHERE profile_id = v_caller_id;

  IF v_doctor_id IS NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Only registered healthcare practitioners can update appointment status.';
  END IF;

  -- 3. Validate status value
  IF p_status NOT IN ('completed', 'no_show') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Status can only be transitioned to completed or no_show.';
  END IF;

  -- 4. Lock appointment row
  SELECT *
  INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND: Appointment could not be found.';
  END IF;

  -- 5. Verify ownership: must belong to calling doctor
  IF v_appointment.doctor_id != v_doctor_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You do not have permission to modify this appointment.';
  END IF;

  -- 6. Transition validation: cannot transition from cancelled
  IF v_appointment.status = 'cancelled' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot modify status of a cancelled appointment.';
  END IF;

  -- 7. Validate time: future appointments cannot be marked completed or no-show
  v_now_ist := (now() AT TIME ZONE 'Asia/Kolkata');
  v_appt_start := (v_appointment.appointment_date + v_appointment.start_time);

  IF p_status = 'completed' AND v_appt_start > v_now_ist THEN
    RAISE EXCEPTION 'FUTURE_APPOINTMENT: Cannot mark a future appointment completed before its scheduled time.';
  END IF;

  IF p_status = 'no_show' AND v_appt_start > v_now_ist THEN
    RAISE EXCEPTION 'FUTURE_APPOINTMENT: Cannot mark a future appointment as no-show before its scheduled time.';
  END IF;

  -- 8. Update status only (preserves dates, times, patient_id, doctor_id, slot_id)
  UPDATE public.appointments
  SET
    status = p_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_appointment_id
  RETURNING * INTO v_appointment;

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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.update_doctor_appointment_status(UUID, TEXT) TO authenticated;
