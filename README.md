This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Phase 8 — Doctor Discovery and Search

- **Doctor Listing Route**: `/doctors`
- **Authentic Data Enforced**: Displays strictly verified doctor accounts (`verification_status = "verified"`). Zero placeholder doctors, ratings, or simulated fees.
- **Search Capabilities**: Multi-attribute doctor discovery by practitioner name, speciality, clinic name, and city/locality.
- **Filters Implemented**:
  - **Speciality**: Canonical Bhopal specialties (Dermatology, ENT, Dentistry, Cardiology, Neurology, Orthopedics) with URL synchronization (`/doctors?speciality=<slug>`).
  - **Location**: City filtering with initial support for Bhopal.
  - **Consultation Fee**: Range filtering (`Under ₹500`, `₹500 - ₹1000`, `₹1000+`) applying only to authentic fees.
  - **Availability**: Placeholder filter (`Availability — Coming Soon`) for upcoming scheduling release.
  - **Ratings**: Authentic rating badge only displays when legitimate ratings exist in the database.
- **Components**: Reusable [`DoctorCard`](file:///c:/Users/vidhe/MediSphere/components/doctors/DoctorCard.tsx) and [`DoctorListingClient`](file:///c:/Users/vidhe/MediSphere/components/doctors/DoctorListingClient.tsx).

## Phase 9 — Real Bhopal Doctor and Clinic Data

- **Source-Backed Datasets**: Real medical practitioner and clinic datasets located at `data/doctors/bhopal-doctors.json` and `data/clinics/bhopal-clinics.json`.
- **Specialities Covered**: Covers all 6 MediSphere specialities in Bhopal, MP (Dermatology, ENT, Dentistry, Cardiology, Neurology, Orthopedics) with 20 verified doctor records and 3 registered healthcare facilities.
- **Source Provenance**: Every record preserves its original trustworthy public source URL (official hospital/clinic directories such as Bansal Hospital and Apollo Sage Hospitals).
- **Default Pending Status**: All newly imported records strictly begin with `verification_status = "pending"`. They are never automatically verified.
- **Admin Verification Required**: Only doctors with `verification_status = "verified"` appear in the public doctor listing (`/doctors`). Admin review is required before publication.
- **Missing Information Integrity**: Any unverified or unpublished information (e.g. fees, experience) is strictly stored as `null`. No guesswork, mock values, or placeholders.
- **Duplicate Prevention**: Batch import pipeline verifies uniqueness by doctor name, speciality, and clinic affiliation before queueing.

## Phase 10 — Doctor Availability and Schedule Management

- **Doctor Schedule Management Route**: `/doctor/schedule` (also accessible via Doctor Workspace at `/doctor/dashboard`).
- **Database Schema**: Dedicated `doctor_schedules` table with foreign key to `doctors(id)`, tracking `day_of_week`, `start_time`, `end_time`, `break_start`, `break_end`, `appointment_duration`, and `is_active`.
- **Days of Week**: Full weekly support for Monday through Sunday with unique constraint on `(doctor_id, day_of_week)`.
- **Healthcare Business Logic**:
  - Enforces `end_time > start_time`.
  - Enforces `break_end > break_start` within working hours (`break_start >= start_time` and `break_end <= end_time`).
  - Enforces `appointment_duration > 0` and within available working duration.
- **Role-Based Security & RLS**:
  - Doctors can only view, insert, update, and delete their own schedules.
  - Doctor A cannot modify Doctor B's schedule.
  - Patients cannot modify any schedule records.
  - Reusable patient query service (`getActiveDoctorSchedule(doctorId)`) retrieves only active schedules of verified doctors.
- **Zero Mock Availability**: Doctors without a configured schedule have no available hours displayed; availability is strictly provider-configured.

## Phase 11 — Appointment Slot Generation

- **Slot Management Route**: `/doctor/slots` (accessible via Doctor Workspace and Schedule Manager).
- **Database Schema**: Dedicated `appointment_slots` table with foreign key to `doctors(id)`, tracking `slot_date`, `start_time`, `end_time`, and `status` (`available`, `booked`, `blocked`).
- **Strict Timezone Handling**: All scheduling calculations and date conversions strictly use `Asia/Kolkata` (IST, UTC+05:30). Dates are parsed using UTC noon reference to avoid any one-day shift across machine timezones.
- **Controlled Generation Range**: Doctors can generate slots on demand for a selected date or across the next 7 days (capped at a maximum of 30 days via `generateDoctorSlots(doctorId, startDate, endDate)`).
- **Healthcare Slot Generation Logic**:
  - Derived strictly from the doctor's active recurring weekly schedule (`doctor_schedules`).
  - Automatically calculates discrete slot windows matching `appointment_duration` (e.g. 15, 20, 30, 45, 60 minutes).
  - Enforces shift boundaries: slots cannot extend beyond the shift's `end_time`.
  - Excludes break periods: any slots overlapping `break_start` to `break_end` (e.g., lunch) are completely excluded.
  - Excludes past slots: historical dates produce 0 slots; for today's date in Asia/Kolkata, slots with start times in the past are automatically skipped.
- **Idempotency & Duplicate Prevention**:
  - Database-level unique constraint on `(doctor_id, slot_date, start_time)`.
  - Batch generation is idempotent: re-running generation never produces duplicate slots and preserves existing `blocked` or `booked` slot states.
- **Slot Blocking**:
  - Doctors can selectively block and unblock available slots from `/doctor/slots`.
  - Blocked slots are preserved in the database for audit history and hidden from patient availability.
  - Doctors cannot manually mark slots as booked.
- **Doctor Verification Guard**:
  - `getAvailableSlots(doctorId, date)` strictly requires `doctors.verification_status = 'verified'` and `status = 'available'`.
  - Pending imported doctors from Phase 9 remain unbookable until explicitly verified.
- **Row Level Security (RLS)**:
  - Public/patients can read only `available` slots belonging to `verified` doctors.
  - Doctors can read and update (block/unblock) only their own slots (`doctors.profile_id = auth.uid()`).
  - Doctors cannot modify another doctor's slots or set status to `booked`.
  - Public users and patients cannot insert, update, or delete slots.
- **Scope Boundary**: Zero fake appointments, zero fake bookings. Booking workflows, payments, and checkout remain reserved for subsequent phases.

## Phase 12 — Patient Appointment Booking

- **Patient Booking Route**: `/doctors/[id]/book` (accessible via Doctor Profile "Book Appointment" CTA).
- **Patient Appointment History**: `/dashboard/appointments` (accessible via Patient Dashboard).
- **Appointments Table**: Dedicated `public.appointments` table with foreign keys to `profiles(id)`, `doctors(id)`, and `appointment_slots(id)`, tracking `patient_id`, `doctor_id`, `slot_id`, `appointment_date`, `start_time`, `end_time`, `status` (`confirmed`, `cancelled`, `completed`, `no_show`), `reason`, and `notes`.
- **Atomic Booking Function**: Stored procedure `public.book_appointment(p_slot_id, p_reason, p_notes)` executed with `SECURITY DEFINER` inside a PostgreSQL transaction:
  - Validates authenticated patient caller using `auth.uid()`.
  - Acquires row-level exclusive lock on the slot row via `SELECT ... FOR UPDATE` to strictly serialize concurrent requests.
  - Verifies slot existence, doctor ownership, and `slot.status = 'available'`.
  - Validates slot date and time against current timestamp in `Asia/Kolkata` (IST) to reject past slots.
  - Verifies doctor exists and `doctor.verification_status = 'verified'` (pending doctors cannot be booked).
  - Inserts exactly one appointment with status `confirmed`.
  - Atomically transitions slot status from `available` to `booked`.
- **Double-Booking Protection**:
  - Row-level lock (`FOR UPDATE`) prevents simultaneous execution race conditions.
  - Database-level uniqueness rule via `CONSTRAINT unique_appointment_slot UNIQUE (slot_id)` guarantees at the engine level that two confirmed appointments can never share a slot.
  - Attempted concurrent bookings fail cleanly with patient-friendly error messages without raw database error leaks.
- **Row Level Security (RLS)**:
  - Patients can only view their own appointments (`patient_id = auth.uid()`).
  - Doctors can view appointments booked with them (`doctors.profile_id = auth.uid()`).
  - Direct public inserts are blocked; booking is only permitted through the atomic RPC function.
  - Patients cannot manually manipulate slot statuses or book blocked/unverified slots.

## Phase 13 — Patient Dashboard and Appointment History

- **Patient Dashboard Overview (`/dashboard`)**:
  - Personalized welcome greeting with the patient's verified full name.
  - Database-driven aggregate counters: Total appointments, Upcoming active appointments, Completed visits, and Cancelled appointments. Zero mock or sample data.
  - Next upcoming consultation card with practitioner, clinic, and `Asia/Kolkata` time spotlight.
  - Quick access navigation to Find Doctors, My Appointments, and Profile Settings.
- **Appointment History (`/dashboard/appointments`)**:
  - Displays authenticated patient's real appointment records with complete doctor, speciality, clinic, date, time, and status information.
  - 7 status filter tabs: All, Upcoming, Past, Confirmed, Completed, Cancelled, and No Show.
  - Real-time client-side search filtering by doctor, speciality, and clinic name.
  - Friendly empty states for zero total appointments and zero filter matches.
- **Appointment Details (`/dashboard/appointments/[id]`)**:
  - Detailed consultation breakdown including doctor credentials, consultation fee, clinic contact and address, appointment timestamp, reason for visit, and notes.
  - Strict ownership authorization: Enforces that patients can only view their own appointment. Unowned or non-existent appointments safely present a clean not-found screen without data leakage.
- **Patient Profile (`/dashboard/profile`)**:
  - Displays patient contact details and registration information.
  - Allows editing only permitted schema fields (`full_name`, `phone`, `location`) with input validation.
  - Role immutability: Role cannot be modified to doctor or admin; protected by both client validation and RLS policies.
- **Patient Dashboard Navigation**:
  - Shared responsive header (`PatientDashboardNav`) with desktop tabs, mobile horizontal pills, and mobile dropdown navigation.
  - Quick links for Overview, My Appointments, Find Doctors, My Profile, and Sign Out.
- **Strict Timezone Handling**:
  - Upcoming and past appointment evaluations strictly calculated in `Asia/Kolkata` (IST, UTC+05:30). Cancelled appointments excluded from active upcoming consultations.

## Phase 14 — Doctor Dashboard and Patient Appointments

- **Doctor Dashboard Overview (`/doctor/dashboard`)**:
  - Database-driven aggregate counters strictly computed in `Asia/Kolkata` (IST): Total appointments, Today's appointments, Upcoming confirmed appointments, Completed appointments, and Cancelled appointments. Zero mock or sample metrics.
  - Today's appointment schedule spotlight with real-time consultation feed and quick access to details.
  - Practitioner overview card displaying verified credentials and quick workspace navigation.
- **Doctor Appointment Management (`/doctor/appointments`)**:
  - Displays appointments belonging strictly to the authenticated practitioner's doctor profile.
  - Complete consultation card showing formatted appointment ID, patient name, date, time window, status badge, authorized patient contact details (phone, email), and reason for visit.
  - 8 real-time status filter tabs: All, Today, Upcoming, Past, Confirmed, Completed, Cancelled, and No-Show.
  - Multi-attribute client search filtering by patient name, phone, email, reason, or appointment ID.
  - Action controls allowing eligible consultations to be marked as Completed or No-Show.
- **Appointment Details & Status Transitions (`/doctor/appointments/[id]`)**:
  - Detailed breakdown of consultation specifics, scheduled slot times, patient contact information, clinical reason, and notes.
  - Strict ownership authorization: doctors can only open appointments assigned to their own practice; unowned or missing appointments render a safe unauthorized/not-found screen.
  - Server and database-side validation for status transitions:
    - Only the doctor associated with the appointment can update status (patients and other doctors strictly rejected).
    - Status can only transition to `completed` or `no_show`.
    - Future appointments cannot be marked completed or no-show before their scheduled time in `Asia/Kolkata`.
    - Cancelled appointments cannot transition to completed or no-show.
    - Dates, times, patient IDs, doctor IDs, and slot IDs are strictly immutable.
    - Double-booking protection preserved (slot remains `booked`).
- **Unified Doctor Navigation (`DoctorDashboardNav`)**:
  - Shared responsive header with desktop navigation tabs, mobile menu drawer, brand logo, public site toggle, and authenticated sign out.
  - Integrated across `/doctor/dashboard`, `/doctor/appointments`, `/doctor/appointments/[id]`, `/doctor/schedule`, and `/doctor/slots`.
- **Database Security & RLS**:
  - Migration `20261014000000_doctor_appointments.sql` with dedicated RLS policies on `public.profiles` and `public.appointments`.
  - Atomic PostgreSQL stored procedure `public.update_doctor_appointment_status(p_appointment_id, p_status)`.

## Phase 15 — Email Appointment Confirmation

- **Transactional Email Provider**: Integrated [Resend](https://resend.com) (`resend` SDK) for transactional appointment confirmation emails within MediSphere's existing Next.js server-side architecture.
- **Required Environment Variables (Server-Only)**:
  - `RESEND_API_KEY`: Resend API key for dispatching transactional emails (server-only; never exposed to browser or client bundles via `NEXT_PUBLIC_`).
  - `RESEND_FROM_EMAIL`: Sender email address (e.g. `MediSphere <appointments@medisphere.health>` or `MediSphere <onboarding@resend.dev>`).
  - `APP_BASE_URL`: Base application URL for generating absolute links in emails (e.g. `http://localhost:3000` or production domain).
  - Documented in `.env.example` without secrets. The application builds and functions normally even when credentials are not configured.
- **Email Confirmation Sequence**:
  1. Patient submits a booking request through the booking interface (`/doctors/[id]/book`).
  2. Database executes atomic `book_appointment` stored procedure: locks slot row (`SELECT ... FOR UPDATE`), verifies practitioner verification status, creates the appointment record, and marks slot `booked`.
  3. Server receives the confirmed booking result from PostgreSQL.
  4. Server sends the confirmation email to the authenticated patient.
  5. Failed bookings (e.g., slot unavailable, blocked, or expired) never trigger an email.
- **Email Content & Formatting**:
  - Professional, responsive HTML email with accessible plain-text alternative.
  - MediSphere healthcare branding, appointment confirmation header, patient greeting (if available), doctor name, speciality, clinic name & address (when available), appointment date, time window, status, and appointment reference ID.
  - Date and time windows are strictly evaluated and formatted in `Asia/Kolkata` (IST, UTC+05:30).
  - Direct deep link to the patient's appointment details page (`/dashboard/appointments/[id]`).
  - User and database strings are sanitized with HTML entity escaping to prevent injection.
  - Sensitive medical notes and private consultation reasons are omitted to preserve patient confidentiality.
- **Recipient Verification & Tenant Isolation**:
  - Recipient email is derived exclusively from the authenticated patient's account session (`user.email`) or verified profile.
  - Browser-supplied recipient overrides are rejected.
  - Cross-tenant security: Users cannot request or trigger confirmation emails for appointments belonging to other patients.
- **Reliability & Safe Failure Handling**:
  - Email delivery failures never corrupt or undo booking state.
  - If email delivery fails (e.g., provider downtime, invalid credentials, rate limits):
    - The appointment remains confirmed in `public.appointments`.
    - The slot remains booked in `public.appointment_slots`.
    - Server logs delivery failures safely without exposing secrets.
    - Patient sees that their appointment was successfully booked, along with an honest delivery notice.
- **Duplicate Prevention**:
  - In-memory idempotency cache prevents duplicate email dispatches from network retries or rapid clicks.
  - Refreshing the confirmation screen does not resend emails or re-execute bookings.

## Phase 16 — Doctor Reviews and Ratings

- **Doctor Reviews Route & Details Page**: Integrated review submission into the patient appointment details page (`/dashboard/appointments/[id]`) and public reviews list into the doctor profile (`/doctors/[id]`) and doctor dashboard (`/doctor/dashboard`).
- **Review Eligibility**:
  - A patient may review a doctor only when authenticated and submitting a review for their own appointment.
  - The appointment must belong to the doctor being reviewed.
  - The appointment status must strictly be `completed` (cancelled, confirmed, and no-show appointments are rejected).
  - Validation is enforced at both the database and server levels (via unique constraints, RLS, and triggers).
- **One Review per Appointment (Duplicate Prevention)**:
  - Database-level `UNIQUE (appointment_id)` constraint prevents multiple reviews for the same appointment, even across multiple browser tabs or direct API calls.
  - Duplicate submissions receive a friendly error message without corrupting records.
- **Rating Range & Content**:
  - Rating must strictly be an integer from 1 to 5 stars (`CHECK (rating >= 1 AND rating <= 5)`).
  - Review text is optional with a reasonable limit of 1000 characters (`CHECK (length(review_text) <= 1000)`).
  - Immuntable fields: Patient ID, Doctor ID, and Appointment ID cannot be altered after submission.
- **Public Review Privacy Rules**:
  - Public users and practitioners may read published reviews and aggregate ratings.
  - Public queries strictly omit patient email, phone number, authentication IDs, private profile fields, and appointment notes.
  - Reviews display only a sanitized reviewer display name (first name or "Verified Patient") alongside verified consultation badges.
- **Authentic Rating Calculations**:
  - Average ratings and review counts are calculated strictly from real MediSphere reviews in the database.
  - Zero reviews are handled safely by displaying "No patient reviews yet" with no fabricated default ratings (e.g., 5.0). External directory ratings are never imported.

## Phase 17 — Location and Maps Integration

- **Map Provider**: Google Maps JavaScript API (selected for simplicity, standard mobile directions support in India, and zero heavy WASM/WebGL bundle overhead).
- **Environment Variable**:
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Client-safe publishable Google Maps JavaScript API key.
  - Documented as a placeholder in `.env.example`.
- **How to Configure the Map**:
  1. Obtain a publishable Google Maps API key from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis) with the **Maps JavaScript API** enabled.
  2. Restrict the key by HTTP referrers (e.g. `localhost:3000/*` and your production domain).
  3. Add the key to `.env.local`:
     ```env
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
     ```
  4. If the API key is not configured, MediSphere gracefully renders a clean fallback view displaying verified clinic cards, authentic coordinates, addresses, and external directions links without crashing.
- **Location Permission Behavior**:
  - **Strictly Optional & On-Demand**: MediSphere never requests browser location automatically on page load. Location is requested only when the patient clicks "Find Near Me".
  - **Explicit Disclosure**: Explains why location is needed before or during the permission prompt.
  - **Local-Only Coordinates**: Coordinates are kept strictly in transient client-side component state during the active browser session. They are never written to PostgreSQL database tables, never saved to localStorage, and never transmitted to doctors or third parties.
  - **Non-blocking Rejection**: If the user declines location permission, the rest of the application functions completely; patients can continue discovering clinics and doctors using city, locality, and clinic filters.
- **Clinic Coordinate & Direction Integrity**:
  - Display markers only for clinics with verified institutional coordinates (Bansal Hospital: `23.1994, 77.4197`, Apollo Sage Hospitals: `23.1773, 77.4422`, AIIMS Bhopal: `23.2106, 77.4574`).
  - Missing coordinates never produce fake or guessed map markers; they display physical addresses as text.
  - Directions links navigate directly to verified destinations via authentic Google Maps directions URLs.
  - Proximity distance calculations use the Haversine formula and display authentic distances only when both user and clinic coordinates are verified.

## Phase 18 — 3D Speciality Discovery Experience

- **Interactive 3D Healthcare Discovery**: Transforms the homepage medical specialities section into a futuristic, dark navy holographic spatial scene (`#070d18`) with cyan/blue luminescent accents and glassmorphic HUD controls.
- **Dependencies Added**:
  - `three` (`^0.186.1`): WebGL 3D graphics rendering engine.
  - `@types/three` (`^0.186.0`): Complete TypeScript definitions for Three.js.
  - `@react-three/fiber` (`^9.8.2`): React 19-native declarative Three.js reconciler.
  - `@react-three/drei` (`^10.7.9`): Helpers, OrbitControls, Float, and spatial HTML overlays.
- **Six Procedural Medical Sculptures**:
  - 100% lightweight procedural Three.js geometry — zero unlicensed third-party assets, zero external mesh network overhead.
  - **Cardiology**: Procedural 3D anatomical heart with aorta arch, coronary vessels, and rhythmic heartbeat systole/diastole pulse.
  - **Neurology**: Dual hemisphere neural cortex with 12 synaptic node beacons and rotating orbital signal rings.
  - **Orthopedics**: Articulated vertebral column with 4 stacked vertebrae, cyan intervertebral discs, and breathing sway.
  - **Dentistry**: Pearlescent molar crown with 4 occlusal cusps, cervical neck, dual tapered roots, and protective halo.
  - **ENT**: Auditory cochlea logarithmic spiral, tympanic canal, and concentric sonic resonance frequency wave arcs.
  - **Dermatology**: Layered hexagonal cellular lattice shield symbolizing the epidermal barrier with bio-luminescent strata.
- **Interactive Capabilities**:
  - Intuitive OrbitControls (damping enabled, rotation limits, auto-rotation with user pause toggle).
  - Hover / click node inspection with dynamic scale lerping and lighting glow.
  - Interactive HUD Inspector Card with clinical focus areas, quick jump selector rail, and direct link to existing `/specialities/[slug]` routes.
- **Accessibility & Resiliency**:
  - **Accessible 2D Grid Mode**: High-contrast, dark navy glassmorphic grid mode available via instant toolbar toggle.
  - **Mobile Ergonomics**: Defaults to clean 2D layout on mobile devices while allowing users to opt into 3D.
  - **Screen Reader Support**: Hidden and focus-revealed keyboard navigation rail with direct links to all 6 specialities.
  - **Reduced Motion Support**: Detects `prefers-reduced-motion` at OS level, pausing orbital rotation and model oscillations.
  - **WebGL Error Safeguard**: Built-in `WebGLErrorBoundary` and client-side `detectWebGL()` gracefully fall back to 2D view if hardware acceleration is unavailable.
