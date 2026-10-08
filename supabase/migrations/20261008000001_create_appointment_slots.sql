-- ==============================================================================
-- Migration: 20261008000001_create_appointment_slots.sql
-- Description: Date-specific appointment slots derived from doctor schedules
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointment_slots_doctor_date ON public.appointment_slots(doctor_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_status ON public.appointment_slots(status);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_lookup ON public.appointment_slots(doctor_id, slot_date, status);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_appointment_slots_updated_at ON public.appointment_slots;
CREATE TRIGGER set_appointment_slots_updated_at
  BEFORE UPDATE ON public.appointment_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Public/Patients can read available slots of verified doctors; Doctors can read their own slots
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
