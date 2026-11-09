# MediSphere Production Deployment Guide

> **MediSphere** — Healthcare Provider Discovery, Scheduling & Appointment Management Platform  
> Target Jurisdiction: Bhopal, Madhya Pradesh, India (Timezone: `Asia/Kolkata`)

This document provides a comprehensive, production-grade deployment roadmap for launching MediSphere on Supabase and Vercel.

---

## 1. Prerequisites

- A [Supabase](https://supabase.com) account & project
- A [Vercel](https://vercel.com) account linked to your Git repository
- A [Resend](https://resend.com) account for transactional confirmation emails
- (Optional) A [Google Cloud Console](https://console.cloud.google.com) project with Maps JavaScript API enabled
- Node.js `20.x` or later and npm `10.x` or later

---

## 2. Supabase Backend Setup

### 2.1 Project Creation
1. Log in to the [Supabase Dashboard](https://app.supabase.com).
2. Click **New project** and name it (e.g., `medisphere-prod`).
3. Select your region closest to Bhopal/India (e.g., `ap-south-1` Mumbai).
4. Securely store your database password.

### 2.2 Database Migration & Schema
There are two reliable ways to apply the database schema:

#### Option A: Single Master Schema (Recommended for Fresh Deployments)
1. In your Supabase Dashboard, navigate to the **SQL Editor**.
2. Click **New query**.
3. Copy and paste the entire contents of [`supabase/schema.sql`](../supabase/schema.sql).
4. Click **Run**. This provisions all 8 tables, indexes, triggers, RLS policies, and stored procedures (Phase 3 through Phase 20).

#### Option B: Incremental Migrations via Supabase CLI
```bash
# Link your local project to Supabase
npx supabase link --project-ref your-project-ref

# Push all migrations in order
npx supabase db push
```

### 2.3 Verify Row Level Security (RLS)
Execute the verification query in [`supabase/verify.sql`](../supabase/verify.sql) to ensure RLS is active on:
- `profiles`
- `specialities`
- `clinics`
- `doctors`
- `doctor_schedules`
- `appointment_slots`
- `appointments`
- `doctor_reviews`
- `notifications`

---

## 3. Secure Initial Administrator Setup

> **CRITICAL SECURITY RULE:** No user can grant themselves administrative access via client-side registration or browser requests. Administrator access is strictly controlled by server-side database records.

### Method A: Supabase Dashboard SQL Editor (Recommended)
1. Have the prospective administrator register a patient account on the public site at `/register`.
2. Once registered, log in to your Supabase Dashboard -> **SQL Editor**.
3. Run the following authorized query:
```sql
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE email = 'admin@yourdomain.com';
```
4. Verify the updated row:
```sql
SELECT id, full_name, email, role FROM public.profiles WHERE role = 'admin';
```

### Method B: Maintenance Script
```bash
npx tsx scripts/promote-admin.ts admin@yourdomain.com
```

Once promoted, the administrator can log in directly at:
```
https://your-domain.com/admin/login
```

---

## 4. Environment Variables Configuration

In your Vercel Project Settings (or `.env.local` for local staging), configure the following environment variables:

| Variable Name | Required | Scope | Description | Example |
|---------------|----------|-------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Client/Server | Supabase Project API URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Client/Server | Supabase Anon Public Key | `eyJhbGciOi...` |
| `RESEND_API_KEY` | **Yes** | Server-Only | Resend API Key | `re_123456789...` |
| `RESEND_FROM_EMAIL` | **Yes** | Server-Only | Verified sender email address | `MediSphere <appointments@yourdomain.com>` |
| `APP_BASE_URL` | **Yes** | Server-Only | Public URL for email confirmation links | `https://medisphere.in` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Client/Server | Google Maps Browser API Key | `AIzaSy...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-Only / CLI | Maintenance script elevation only | `eyJhbGciOi...` |

> **Security Check:** NEVER prefix `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`.

---

## 5. Resend Email Domain Configuration

1. In the [Resend Console](https://resend.com/domains), add your production domain (e.g., `yourdomain.com`).
2. Add the generated `DKIM`, `SPF`, and `DMARC` TXT records to your DNS registrar.
3. Once verified in Resend, set `RESEND_FROM_EMAIL` to an address on your domain:
   ```
   RESEND_FROM_EMAIL="MediSphere <appointments@yourdomain.com>"
   ```
4. Note: If testing in development without a domain, you may use `onboarding@resend.dev` (only delivers to your Resend account email).

---

## 6. Google Maps Configuration (Optional)

1. Navigate to [Google Cloud Console -> Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an API Key.
3. Under **API restrictions**, restrict the key to **Maps JavaScript API**.
4. Under **Application restrictions**, select **Websites** and add your production domain:
   - `https://your-domain.com/*`
   - `https://*.vercel.app/*` (for preview deployments)
5. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel.

---

## 7. Vercel Deployment

### 7.1 Automatic Deployment via GitHub
1. Connect your repository to Vercel via **Add New Project**.
2. Select Framework: **Next.js**.
3. Build Command: `next build --webpack` (configured in `package.json`).
4. Output Directory: `.next`.
5. Enter the Environment Variables from Section 4.
6. Click **Deploy**.

### 7.2 Manual Deployment via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy Preview
vercel

# Deploy Production
vercel --prod
```

---

## 8. Post-Deployment Smoke Tests

Verify the following 10 check items immediately after deployment:

1. **Homepage & Specialities:**
   - Visit `https://your-domain.com/`.
   - Verify 3D speciality discovery renders (or 2D accessible grid if WebGL disabled).
2. **Patient Authentication:**
   - Register a new test patient at `/register`.
   - Verify redirect to `/dashboard`.
3. **Doctor Verification Isolation:**
   - Unverified/pending doctors are hidden from public doctor listing (`/doctors`).
   - Only verified doctors can be viewed or booked.
4. **Administrative Console:**
   - Sign in at `/admin/login` using your configured admin credentials.
   - Verify real database statistics load on `/admin`.
   - Verify pending doctors appear in `/admin/doctors`.
5. **Doctor Verification Workflow:**
   - In `/admin/doctors`, click **Verify** on a test doctor.
   - Verify the doctor now appears in public search (`/doctors`).
6. **Slot Generation & Atomic Booking:**
   - As a verified doctor, configure schedules in `/doctor/schedule` and generate slots in `/doctor/slots`.
   - As a patient, book a slot at `/doctors/[id]/book`.
   - Confirm double-booking is rejected if attempted simultaneously.
7. **Email Delivery:**
   - Verify the patient receives a confirmation email via Resend.
   - Ensure an email failure does NOT rollback a confirmed database appointment.
8. **Patient Privacy Isolation:**
   - Ensure Patient A cannot see Patient B's appointment history in `/dashboard/appointments`.
9. **Review Moderation:**
   - Check `/admin/reviews` to inspect patient reviews.
   - Confirm ordinary patients can only review completed consultations.
10. **Timezone Accuracy:**
    - Verify all dates and times are displayed in `Asia/Kolkata` (IST).

