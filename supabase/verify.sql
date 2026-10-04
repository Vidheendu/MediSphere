-- ==============================================================================
-- MEDISPHERE - PHASE 3 VERIFICATION SCRIPT
-- Run this in your Supabase SQL Editor to verify tables, rows, indexes, and RLS
-- ==============================================================================

-- 1. Check Table Existence
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'specialities', 'clinics', 'doctors')
ORDER BY table_name;

-- 2. Verify the 6 Seeded Specialities (Count should be 6, No fake data)
SELECT id, name, slug, description, created_at
FROM public.specialities
ORDER BY name;

-- 3. Verify Row Count Across Tables (doctors & clinics should be 0; specialities should be 6)
SELECT 'profiles' AS table_name, count(*) AS total_rows FROM public.profiles
UNION ALL
SELECT 'specialities' AS table_name, count(*) AS total_rows FROM public.specialities
UNION ALL
SELECT 'clinics' AS table_name, count(*) AS total_rows FROM public.clinics
UNION ALL
SELECT 'doctors' AS table_name, count(*) AS total_rows FROM public.doctors;

-- 4. Verify Row Level Security (RLS) is ENABLED on all 4 tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'specialities', 'clinics', 'doctors');

-- 5. Verify Indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'specialities', 'clinics', 'doctors')
ORDER BY tablename, indexname;
