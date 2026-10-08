-- ==============================================================================
-- Migration: 20261008000000_create_doctor_schedules.sql
-- Description: Doctor working days, recurring hours, breaks, and slot durations
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON public.doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_active ON public.doctor_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_lookup ON public.doctor_schedules(doctor_id, day_of_week, is_active);

-- Automatic updated_at trigger
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
