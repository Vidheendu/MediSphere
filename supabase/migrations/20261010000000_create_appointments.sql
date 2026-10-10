-- ==============================================================================
-- Migration: 20261010000000_create_appointments.sql
-- Description: Patient appointment booking system with atomic double-booking protection
-- ==============================================================================

-- 1. Create appointments table
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
  -- Database-level uniqueness rule preventing multiple active appointments for the same slot
  CONSTRAINT unique_appointment_slot UNIQUE (slot_id)
);

-- 2. Indexes for fast relational queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_id ON public.appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_lookup ON public.appointments(patient_id, appointment_date, status);

-- 3. Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Patients can view only their own appointments; Doctors can view appointments booked with them; Admins have full read access
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

-- Policy 2: INSERT is controlled via the atomic book_appointment RPC function.
-- Direct inserts are restricted to administrators to prevent bypassing slot validation.
CREATE POLICY "Allow admin direct insert on appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy 3: UPDATE access for administrators
CREATE POLICY "Allow admin update on appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Atomic Booking Function (Double-Booking Protection)
-- Locks slot row FOR UPDATE to strictly serialize concurrent booking attempts.
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.book_appointment(UUID, TEXT, TEXT) TO authenticated;
