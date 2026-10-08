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


