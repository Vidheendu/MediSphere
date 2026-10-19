-- Migration: 20261017000000_clinic_locations.sql
-- Description: Add spatial index and update verified coordinates for verified clinics in Bhopal

-- 1. Create index for clinic geographic coordinate lookup
CREATE INDEX IF NOT EXISTS idx_clinics_coordinates ON public.clinics (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2. Update verified Bhopal clinic coordinates from official provenance
UPDATE public.clinics
SET
  latitude = 23.1994,
  longitude = 77.4197,
  updated_at = timezone('utc'::text, now())
WHERE name ILIKE '%Bansal Hospital%' AND (latitude IS NULL OR longitude IS NULL);

UPDATE public.clinics
SET
  latitude = 23.1773,
  longitude = 77.4422,
  updated_at = timezone('utc'::text, now())
WHERE name ILIKE '%Apollo Sage%' AND (latitude IS NULL OR longitude IS NULL);

UPDATE public.clinics
SET
  latitude = 23.2106,
  longitude = 77.4574,
  updated_at = timezone('utc'::text, now())
WHERE name ILIKE '%AIIMS%' AND (latitude IS NULL OR longitude IS NULL);
