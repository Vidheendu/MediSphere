# MediSphere — Verified Healthcare Data Import Foundation

This directory houses the schemas, templates, and specifications for importing **authentic, verified healthcare data** for doctors and clinics in Bhopal into MediSphere.

---

## 1. How Doctor Data Should Be Formatted

Doctor data must be formatted as a valid JSON array or object adhering strictly to [`doctor.schema.json`](file:///c:/Users/vidhe/MediSphere/data/doctors/doctor.schema.json). A template is available at [`doctor.template.json`](file:///c:/Users/vidhe/MediSphere/data/doctors/doctor.template.json).

### Doctor Record JSON Structure:
```json
{
  "name": "Dr. Full Legal Name",
  "speciality": "Cardiology",
  "qualification": "MBBS, MD (Medicine), DM (Cardiology)",
  "experience_years": 14,
  "consultation_fee": 800,
  "about": "Consultant interventional cardiologist with focus on preventive cardiology and echocardiography.",
  "clinic": "Bhopal Heart and Vascular Care Center",
  "address": "12 Arera Colony",
  "city": "Bhopal",
  "state": "Madhya Pradesh",
  "phone": "+91 755 0000000",
  "website": "https://example-hospital.org",
  "source": "Madhya Pradesh Medical Council Official Public Registry (Reg #MP-12345)",
  "verification_status": "pending"
}
```

---

## 2. How Clinic Data Should Be Formatted

Clinic data must be formatted as a valid JSON array or object adhering to [`clinic.schema.json`](file:///c:/Users/vidhe/MediSphere/data/clinics/clinic.schema.json). A template is available at [`clinic.template.json`](file:///c:/Users/vidhe/MediSphere/data/clinics/clinic.template.json).

### Clinic Record JSON Structure:
```json
{
  "name": "Bhopal Heart and Vascular Care Center",
  "address": "12 Arera Colony, Near Bittan Market",
  "city": "Bhopal",
  "state": "Madhya Pradesh",
  "pincode": "462016",
  "phone": "+91 755 2420000",
  "website": "https://example-hospital.org",
  "latitude": 23.2185,
  "longitude": 77.4332,
  "source": "Bhopal Municipal Corporation Healthcare Facility Registry"
}
```

---

## 3. What Fields Are Required

### Required Doctor Fields:
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Full legal/professional name (minimum 2 characters). |
| `speciality` | string | Must exactly match one of the 6 canonical Bhopal specialities: `Dermatology`, `ENT`, `Dentistry`, `Cardiology`, `Neurology`, `Orthopedics`. |
| `source` | string | Documented provenance (registry name, publication link, official government/hospital directory). Minimum 5 characters. |

### Optional Doctor Fields (Use `null` if unconfirmed):
- `qualification` (`string | null`)
- `experience_years` (`integer >= 0 | null`)
- `consultation_fee` (`number >= 0 | null`)
- `about` (`string | null`)
- `clinic` (`string | null`)
- `address` (`string | null`)
- `city` (`string | null`)
- `state` (`string | null`)
- `phone` (`string | null`)
- `website` (`string | null`)
- `profile_id` (`string | null`)

### Required Clinic Fields:
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Official registered name of the clinic or medical center (minimum 2 characters). |
| `source` | string | Provenance of the facility information (minimum 5 characters). |

---

## 4. How Missing Information Should Be Handled

1. **Use `null` explicitly**: Whenever an attribute is not definitively documented in the verified public source, set the value to `null`.
2. **Never guess or extrapolate**: Do not infer consultation fees, years of experience, clinic affiliations, or contact numbers from partial evidence.
3. **Never use dummy strings**: Do not fill fields with `"Unknown"`, `"N/A"`, `"Not specified"`, `"0"`, or dummy phone numbers (`"9999999999"`).
4. **Data preservation principle**: An incomplete but 100% accurate record is infinitely superior to an apparently complete record containing fabricated details.

---

## 5. Why Fake Data Must NOT Be Added

Healthcare systems carry profound real-world consequences:
- **Patient Health & Safety**: Patients rely on provider directories when seeking diagnosis and treatment. Inaccurate specialties or fabricated credentials directly endanger patients.
- **Ethical & Legal Compliance**: Fabricating medical licenses, practitioner associations, or clinic services violates legal compliance, medical council regulations, and privacy standards.
- **Platform Integrity**: MediSphere's core value proposition is verified discovery. Inserting mock doctors or fake consultation fees destroys platform credibility.
- **Strict Verification Queue**: All imported records are forced to `verification_status = "pending"`. They remain invisible from patient discovery until an administrator validates the doctor's credentials against medical licensing authorities.

---

## 6. How to Import Data

MediSphere provides both an automated CLI import tool and reusable service functions.

### Step 1: Prepare Verified Data File
Create a JSON file inside `data/doctors/` containing verified public records (e.g. `data/doctors/bhopal_specialists.json`).

### Step 2: Validate and Import via CLI
Run the import command:
```bash
# Using npm script:
npm run import:data -- data/doctors/bhopal_specialists.json

# Or using npx tsx directly:
npx tsx scripts/import-data.ts data/doctors/bhopal_specialists.json
```

### Step 3: What the Import System Does
1. **Schema Validation**: Validates that all records contain `name`, valid `speciality`, and `source`.
2. **Speciality Mapping**: Matches the speciality string against the Supabase `specialities` database table.
3. **Clinic Resolution**: If `clinic` is specified, looks up the clinic or creates an entry in `clinics` table.
4. **Duplicate Prevention**: Checks if a doctor with identical name and speciality already exists in Supabase. Duplicate records are skipped with an audit log.
5. **Source Preservation**: Annotates the record's provenance into the database record for full auditability.
6. **Strict Pending Status**: Forces `verification_status = "pending"`. Imported doctors **never** bypass the administrative verification gate.

### Step 4: Verification Review
An administrator reviews pending doctor applications in Supabase and promotes verified providers by updating `verification_status` to `'verified'`.
Once marked verified, the doctor immediately appears in public search and discovery (`/test/doctors`).
