# MediSphere 🏥

### Your Healthcare, Connected.

MediSphere is a full-stack healthcare appointment and doctor discovery platform designed to make healthcare more accessible and convenient. It connects patients with doctors and healthcare facilities through speciality-based discovery, appointment scheduling, secure dashboards, and location-based services.

The platform focuses on healthcare discovery in Bhopal, India, with six medical specialities and separate experiences for patients, doctors, and administrators.

---

## ✨ Features

### 🩺 Doctor Discovery
- Explore doctors across six medical specialities.
- Search and filter doctors.
- View doctor profiles and clinic information.
- Access source-backed doctor information.
- Only administrator-verified doctors appear in public listings.

### 📅 Appointment Management
- View available appointment slots.
- Book appointments securely.
- Prevent duplicate bookings through database-level safeguards.
- View appointment history and booking details.
- Receive appointment confirmation emails.

### 👤 Patient Portal
- Patient registration and login.
- Personal dashboard.
- Appointment history and status tracking.
- Profile management.
- Notifications and help section.

### 🩻 Doctor Portal
- Dedicated doctor authentication.
- Doctor dashboard and appointment overview.
- Manage recurring availability schedules.
- Generate and manage appointment slots.
- View and manage patient appointments.
- Notifications and account settings.

### 🛡️ Admin Dashboard
- Dedicated administrator authentication.
- Doctor verification and rejection workflow.
- Manage clinic information.
- Monitor appointments and registered users.
- Review moderation.
- Dashboard statistics based on database records.

### 📍 Location & Maps
- Location-based clinic discovery.
- Interactive map integration.
- Clinic location information and directions.

### 🌐 Interactive 3D Experience
- 3D speciality discovery experience.
- Interactive medical speciality selection.
- Accessible 2D fallback experience.

### ⭐ Reviews & Ratings
- Patients can review eligible completed appointments.
- One review per eligible appointment.
- Ratings are based on actual submitted reviews.

---

## 🏥 Supported Specialities

| Speciality | Medical Area |
|---|---|
| Dermatology | Skin, hair and nail care |
| ENT | Ear, nose and throat |
| Dentistry | Dental and oral healthcare |
| Cardiology | Heart and cardiovascular care |
| Neurology | Brain and nervous system |
| Orthopedics | Bones, joints and muscles |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack application framework |
| React | User interface |
| TypeScript | Type safety |
| Tailwind CSS | Styling and responsive design |
| Supabase | Backend and database |
| PostgreSQL | Relational database |
| Supabase Auth | User authentication |
| Row Level Security | Database access control |
| Three.js | 3D graphics |
| React Three Fiber | 3D experiences in React |
| Drei | 3D helpers and components |
| Resend | Email notifications |
| Google Maps | Maps and location services |
| Vercel | Deployment platform |

---

## 🔐 Security & Data Integrity

MediSphere incorporates security measures throughout its application and database architecture.

- Role-based access for patients, doctors, and administrators.
- Database-level Row Level Security (RLS).
- Protected appointment and profile information.
- Server-side administrator authorization.
- Prevention of unauthorized role escalation.
- Atomic appointment booking to prevent double bookings.
- Doctor verification before public listing and booking.
- Review eligibility checks.
- Notification recipient isolation.
- Sensitive credentials kept out of client-side code.

**Doctor verification:** Imported doctor records begin with a pending verification status. They become publicly discoverable and bookable only after administrator approval.

---

## 📂 Project Structure

```text
MediSphere/
│
├── app/
│   ├── admin/
│   ├── api/
│   ├── dashboard/
│   ├── doctor/
│   ├── doctors/
│   ├── specialities/
│   └── ...
│
├── components/
│   ├── admin/
│   ├── auth/
│   └── ...
│
├── data/
│   ├── doctors/
│   └── clinics/
│
├── docs/
│   └── DEPLOYMENT.md
│
├── lib/
│   ├── auth/
│   └── services/
│
├── scripts/
│
├── supabase/
│   └── migrations/
│
├── types/
│
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git
- A Supabase account and project

### 1. Clone the Repository

```bash
git clone https://github.com/Vidheendu/MediSphere.git
```

```bash
cd MediSphere
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

Add the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="MediSphere <your_verified_sender_email>"

# Application
APP_BASE_URL=http://localhost:3000

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Use the credentials from your own service dashboards. Never commit `.env.local` or expose secret keys in client-side code.

### 4. Configure Supabase

1. Create or select your Supabase project.
2. Configure the database using the migrations in `supabase/migrations/`.
3. Configure authentication and database policies.
4. Verify that the required tables and functions exist.
5. Configure the required authentication settings.

**Important:** If you are connecting to an existing database, inspect its migration history before applying migrations. Do not reset an existing database to install the schema.

Refer to [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for detailed instructions.

### 5. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🧪 Quality Checks

Run the following commands before committing changes:

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npm run build
```

Automated verification scripts are available in the `scripts/` directory.

---

## 🌍 Deployment

MediSphere is prepared for deployment using Vercel and Supabase.

The deployment documentation covers:

- Supabase database configuration and migrations.
- Initial administrator setup.
- Environment variable configuration.
- Resend email configuration.
- Google Maps API configuration.
- Vercel deployment.
- Post-deployment smoke testing.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) before deploying.

---

## 🗺️ Project Roadmap

| Phase | Feature |
|---|---|
| 01–05 | Project foundation, database and authentication |
| 06–09 | Doctor data and speciality discovery |
| 10–11 | Doctor schedules and appointment slots |
| 12–14 | Booking and patient/doctor dashboards |
| 15–16 | Email confirmations and reviews |
| 17–18 | Maps and 3D speciality discovery |
| 19 | Help, settings and notifications |
| 20 | Admin dashboard, security audit and deployment readiness |

---

## ⚠️ Project Status

Development phases 1–20 have been completed.

The reported Phase 20 verification included:

- 82/82 Phase 20 automated checks passed.
- 56/56 Phase 19 checks passed.
- 79/79 Phase 18 checks passed.
- 25/25 Phase 17 checks passed.
- ESLint: 0 errors and 0 warnings.
- TypeScript: no type errors.
- Production build completed successfully.

Cloud deployment and live production functionality must still be verified separately.

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your changes.
5. Submit a pull request.

Please ensure that healthcare data is accurate and that no unverified doctor information, fake appointments, or fabricated reviews are introduced.

---

## 📄 License

This project is licensed under the **MIT License**. See the [`LICENSE`](LICENSE) file for details.

---

## 👨‍💻 Author

**Vidheendu**

- GitHub: [@Vidheendu](https://github.com/Vidheendu)
- Repository: [MediSphere](https://github.com/Vidheendu/MediSphere)

---

<p align="center">
  Built with ❤️ to make healthcare more accessible.
</p>
