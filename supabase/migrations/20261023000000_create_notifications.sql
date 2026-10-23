-- ==============================================================================
-- Migration: 20261023000000_create_notifications.sql
-- Description: Notifications table, RLS policies, indexes, and event triggers for Phase 19
-- ==============================================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'appointment_booked',
      'appointment_completed',
      'appointment_no_show',
      'appointment_cancelled',
      'system'
    )
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for efficient recipient and unread querying
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(recipient_user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_related_appointment
  ON public.notifications(related_appointment_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can view ONLY their own notifications (or admin)
DROP POLICY IF EXISTS "Allow users to view own notifications" ON public.notifications;
CREATE POLICY "Allow users to view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR public.is_admin()
  );

-- Policy 2: Authenticated users can update ONLY their own notifications (e.g. read_at)
DROP POLICY IF EXISTS "Allow users to update own notifications" ON public.notifications;
CREATE POLICY "Allow users to update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Policy 3: Authenticated users can delete ONLY their own notifications
DROP POLICY IF EXISTS "Allow users to delete own notifications" ON public.notifications;
CREATE POLICY "Allow users to delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Policy 4: Allow notification creation by authenticated user for themselves or via trusted operations
DROP POLICY IF EXISTS "Allow insert on notifications" ON public.notifications;
CREATE POLICY "Allow insert on notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can create notifications for themselves, or admin can create, or trusted trigger
    recipient_user_id = auth.uid()
    OR public.is_admin()
    -- Or user is doctor inserting notification for patient of their appointment
    OR EXISTS (
      SELECT 1 FROM public.appointments
      JOIN public.doctors ON doctors.id = appointments.doctor_id
      WHERE appointments.id = related_appointment_id
        AND (doctors.profile_id = auth.uid() OR appointments.patient_id = auth.uid())
    )
  );

-- 4. Database-side Trigger for Real Appointment Events
-- Automatically generates notifications on real booking and status change events
CREATE OR REPLACE FUNCTION public.handle_appointment_notification_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_name TEXT;
  v_patient_name TEXT;
  v_doctor_profile_id UUID;
  v_formatted_date TEXT;
  v_formatted_time TEXT;
BEGIN
  -- Resolve Doctor profile information
  SELECT
    p.full_name,
    d.profile_id
  INTO
    v_doctor_name,
    v_doctor_profile_id
  FROM public.doctors d
  JOIN public.profiles p ON p.id = d.profile_id
  WHERE d.id = NEW.doctor_id;

  -- Resolve Patient profile information
  SELECT full_name INTO v_patient_name
  FROM public.profiles
  WHERE id = NEW.patient_id;

  v_formatted_date := to_char(NEW.appointment_date, 'Mon DD, YYYY');
  v_formatted_time := to_char(NEW.start_time, 'HH12:MI AM');

  -- Case A: Appointment successfully booked (INSERT)
  IF (TG_OP = 'INSERT') THEN
    -- 1. Patient Notification
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_appointment_id = NEW.id
        AND recipient_user_id = NEW.patient_id
        AND type = 'appointment_booked'
    ) THEN
      INSERT INTO public.notifications (
        recipient_user_id,
        type,
        title,
        message,
        related_appointment_id
      ) VALUES (
        NEW.patient_id,
        'appointment_booked',
        'Appointment Confirmed',
        'Your appointment with Dr. ' || COALESCE(v_doctor_name, 'Practitioner') ||
        ' on ' || v_formatted_date || ' at ' || v_formatted_time || ' has been confirmed.',
        NEW.id
      );
    END IF;

    -- 2. Doctor Notification
    IF v_doctor_profile_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_appointment_id = NEW.id
        AND recipient_user_id = v_doctor_profile_id
        AND type = 'appointment_booked'
    ) THEN
      INSERT INTO public.notifications (
        recipient_user_id,
        type,
        title,
        message,
        related_appointment_id
      ) VALUES (
        v_doctor_profile_id,
        'appointment_booked',
        'New Appointment Booking',
        'New appointment booked by ' || COALESCE(v_patient_name, 'a patient') ||
        ' for ' || v_formatted_date || ' at ' || v_formatted_time || '.',
        NEW.id
      );
    END IF;

  -- Case B: Status changed (UPDATE)
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Status -> completed
    IF NEW.status = 'completed' AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_appointment_id = NEW.id
        AND recipient_user_id = NEW.patient_id
        AND type = 'appointment_completed'
    ) THEN
      INSERT INTO public.notifications (
        recipient_user_id,
        type,
        title,
        message,
        related_appointment_id
      ) VALUES (
        NEW.patient_id,
        'appointment_completed',
        'Appointment Completed',
        'Your appointment with Dr. ' || COALESCE(v_doctor_name, 'Practitioner') ||
        ' on ' || v_formatted_date || ' has been marked as completed. You can now leave a verified review.',
        NEW.id
      );

    -- Status -> no_show
    ELSIF NEW.status = 'no_show' AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_appointment_id = NEW.id
        AND recipient_user_id = NEW.patient_id
        AND type = 'appointment_no_show'
    ) THEN
      INSERT INTO public.notifications (
        recipient_user_id,
        type,
        title,
        message,
        related_appointment_id
      ) VALUES (
        NEW.patient_id,
        'appointment_no_show',
        'Appointment Marked as No-Show',
        'Your appointment with Dr. ' || COALESCE(v_doctor_name, 'Practitioner') ||
        ' on ' || v_formatted_date || ' was marked as no-show.',
        NEW.id
      );

    -- Status -> cancelled
    ELSIF NEW.status = 'cancelled' AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_appointment_id = NEW.id
        AND recipient_user_id = NEW.patient_id
        AND type = 'appointment_cancelled'
    ) THEN
      INSERT INTO public.notifications (
        recipient_user_id,
        type,
        title,
        message,
        related_appointment_id
      ) VALUES (
        NEW.patient_id,
        'appointment_cancelled',
        'Appointment Cancelled',
        'Your appointment with Dr. ' || COALESCE(v_doctor_name, 'Practitioner') ||
        ' on ' || v_formatted_date || ' has been cancelled.',
        NEW.id
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to appointments table
DROP TRIGGER IF EXISTS trigger_appointment_notification_events ON public.appointments;
CREATE TRIGGER trigger_appointment_notification_events
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_notification_events();
