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




