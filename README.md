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
