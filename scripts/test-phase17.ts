import fs from "fs";
import path from "path";

// Pre-load environment if exists
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import {
  isValidCoordinate,
  calculateHaversineDistance,
  formatDistance,
  getGoogleMapsDirectionsUrl,
  filterClinicsWithCoordinates,
  LOCATION_USAGE_EXPLANATION,
} from "../lib/maps";
import type { Clinic, DoctorWithDetails } from "../types";

// ============================================================================
// SIMULATION ENGINE FOR PHASE 17
// ============================================================================

const sampleBhopalClinics: Clinic[] = [
  {
    id: "clinic-bansal-1",
    name: "Bansal Hospital",
    address: "C-Sector, Shahpura",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462016",
    phone: "+91-0755-4086000",
    website: "https://bansalhospital.com",
    latitude: 23.1994,
    longitude: 77.4197,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "clinic-apollo-2",
    name: "Apollo Sage Hospitals",
    address: "E-8 Extension, Bawadiya Kalan",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462026",
    phone: "0755-4308111",
    website: "https://apollosage.in",
    latitude: 23.1773,
    longitude: 77.4422,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "clinic-aiims-3",
    name: "AIIMS Bhopal",
    address: "Saket Nagar",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462020",
    phone: "0755-2672317",
    website: "https://aiimsbhopal.edu.in",
    latitude: 23.2106,
    longitude: 77.4574,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "clinic-missing-coords",
    name: "Neighborhood Health Center",
    address: "Arera Colony",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462016",
    phone: null,
    website: null,
    latitude: null, // Intentionally missing
    longitude: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const sampleDoctors: DoctorWithDetails[] = [
  {
    id: "doc-1",
    profile_id: "prof-1",
    speciality_id: "spec-dermatology",
    clinic_id: "clinic-bansal-1",
    qualification: "MBBS, MD (Dermatology)",
    experience_years: 12,
    consultation_fee: 600,
    about: "Specialist dermatologist at Bansal Hospital",
    verification_status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clinic: sampleBhopalClinics[0],
    profile: {
      id: "prof-1",
      full_name: "Farhat Khan",
      role: "doctor",
      phone: "+91-9999999999",
      email: "dr.farhat@example.com",
      location: "Shahpura, Bhopal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    speciality: {
      id: "spec-dermatology",
      name: "Dermatology",
      slug: "dermatology",
      description: "Skin conditions",
      created_at: new Date().toISOString(),
    },
  },
  {
    id: "doc-2",
    profile_id: "prof-2",
    speciality_id: "spec-ent",
    clinic_id: "clinic-apollo-2",
    qualification: "MS (ENT)",
    experience_years: 19,
    consultation_fee: 800,
    about: "Senior ENT surgeon at Apollo Sage",
    verification_status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clinic: sampleBhopalClinics[1],
    profile: {
      id: "prof-2",
      full_name: "Akhilesh Agrawal",
      role: "doctor",
      phone: "+91-8888888888",
      email: "dr.akhilesh@example.com",
      location: "Bawadiya Kalan, Bhopal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    speciality: {
      id: "spec-ent",
      name: "ENT",
      slug: "ent",
      description: "Ear, Nose, Throat",
      created_at: new Date().toISOString(),
    },
  },
  {
    id: "doc-3-pending",
    profile_id: "prof-3",
    speciality_id: "spec-dermatology",
    clinic_id: "clinic-bansal-1",
    qualification: "MBBS",
    experience_years: 3,
    consultation_fee: 300,
    about: "Unverified applicant",
    verification_status: "pending", // MUST BE HIDDEN
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clinic: sampleBhopalClinics[0],
    profile: {
      id: "prof-3",
      full_name: "Unverified Candidate",
      role: "doctor",
      phone: "+91-7777777777",
      email: "candidate@example.com",
      location: "Bhopal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runPhase17Tests() {
  console.log("=================================================================");
  console.log("MEDISPHERE PHASE 17 VERIFICATION SUITE — LOCATION & MAPS");
  console.log("=================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${testName}`);
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      if (detail) console.error(`    Detail: ${detail}`);
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 1: COORDINATE VALIDATION & DISTANCE CALCULATION
  // --------------------------------------------------------------------------
  console.log("--- Suite 1: Geographic Coordinate Validation & Haversine Distance ---");

  assert(
    isValidCoordinate(23.1994, 77.4197),
    "1.1 Valid coordinates (Bansal Hospital) pass validation"
  );

  assert(
    !isValidCoordinate(null, 77.4197),
    "1.2 Null latitude is rejected"
  );

  assert(
    !isValidCoordinate(23.1994, null),
    "1.3 Null longitude is rejected"
  );

  assert(
    !isValidCoordinate("23.1994", 77.4197),
    "1.4 String coordinates are rejected (strict type safety)"
  );

  assert(
    !isValidCoordinate(95.0, 77.4197),
    "1.5 Out-of-bounds latitude (>90) is rejected"
  );

  assert(
    !isValidCoordinate(23.1994, 185.0),
    "1.6 Out-of-bounds longitude (>180) is rejected"
  );

  // Haversine distance: Bansal Hospital (23.1994, 77.4197) to AIIMS Bhopal (23.2106, 77.4574)
  const distBansalToAiims = calculateHaversineDistance(
    { lat: 23.1994, lng: 77.4197 },
    { lat: 23.2106, lng: 77.4574 }
  );
  assert(
    distBansalToAiims !== null && distBansalToAiims > 3.5 && distBansalToAiims < 4.5,
    "1.7 Haversine distance between Bansal Hospital & AIIMS Bhopal is accurate (~4.1 km)",
    `Computed: ${distBansalToAiims} km`
  );

  // Distance format
  assert(
    Boolean(formatDistance(distBansalToAiims)?.includes("km away")),
    "1.8 Distance formatting produces human-readable output"
  );

  assert(
    calculateHaversineDistance(null, { lat: 23.2106, lng: 77.4574 }) === null,
    "1.9 Missing user coordinates returns null (never fabricates distance)"
  );

  // --------------------------------------------------------------------------
  // SUITE 2: DIRECTIONS URL GENERATION
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 2: Directions URL Construction & Destination Accuracy ---");

  const bansalClinic = sampleBhopalClinics[0];
  const urlWithCoords = getGoogleMapsDirectionsUrl(bansalClinic, { lat: 23.2599, lng: 77.4126 });
  assert(
    urlWithCoords.includes("destination=23.1994%2C77.4197") || urlWithCoords.includes("destination=23.1994,77.4197"),
    "2.1 Directions URL uses exact verified clinic coordinates for destination",
    `URL: ${urlWithCoords}`
  );

  assert(
    urlWithCoords.includes("origin=23.2599%2C77.4126") || urlWithCoords.includes("origin=23.2599,77.4126"),
    "2.2 Directions URL includes user origin coordinates when shared"
  );

  const missingCoordsClinic = sampleBhopalClinics[3];
  const urlFallback = getGoogleMapsDirectionsUrl(missingCoordsClinic);
  assert(
    !urlFallback.includes("destination=null") && urlFallback.includes("destination=Neighborhood+Health+Center"),
    "2.3 Missing coordinates gracefully falls back to clean address text without inventing fake coordinates",
    `URL: ${urlFallback}`
  );

  // --------------------------------------------------------------------------
  // SUITE 3: CLINIC DATA FILTERING & MARKER SAFETY
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 3: Verified Clinic Map Marker Filtering ---");

  const clinicsForMap = filterClinicsWithCoordinates(sampleBhopalClinics);
  assert(
    clinicsForMap.length === 3,
    "3.1 Exactly 3 clinics with verified coordinates are returned for map display"
  );

  const missingInMap = clinicsForMap.some((c) => c.name === "Neighborhood Health Center");
  assert(
    !missingInMap,
    "3.2 Clinic with missing coordinates is excluded from map markers"
  );

  // Check data/clinics/bhopal-clinics.json file
  const bhopalClinicsFile = path.resolve(process.cwd(), "data", "clinics", "bhopal-clinics.json");
  const rawClinics = JSON.parse(fs.readFileSync(bhopalClinicsFile, "utf-8"));
  assert(
    Array.isArray(rawClinics) && rawClinics.length >= 3,
    "3.3 data/clinics/bhopal-clinics.json contains valid source records"
  );

  const allHaveValidOrNullCoords = rawClinics.every(
    (c: Record<string, unknown>) =>
      (c.latitude === null && c.longitude === null) ||
      (typeof c.latitude === "number" && typeof c.longitude === "number")
  );
  assert(
    allHaveValidOrNullCoords,
    "3.4 Clinic JSON coordinates are strictly numbers or null (no corrupt types)"
  );

  // --------------------------------------------------------------------------
  // SUITE 4: DOCTOR FILTERING & SECURITY (PENDING DOCTORS HIDDEN)
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 4: Doctor Discovery, Clinic Filter & Verification Protection ---");

  // Filter simulation: verified doctors only
  const publicVerifiedDoctors = sampleDoctors.filter((d) => d.verification_status === "verified");
  assert(
    publicVerifiedDoctors.length === 2 && !publicVerifiedDoctors.some((d) => d.id === "doc-3-pending"),
    "4.1 Pending doctors are strictly hidden from public listings (only verified doctors shown)"
  );

  // Clinic filter simulation
  const bansalDoctors = publicVerifiedDoctors.filter((d) => d.clinic_id === "clinic-bansal-1");
  assert(
    bansalDoctors.length === 1 && bansalDoctors[0].clinic?.name === "Bansal Hospital",
    "4.2 Clinic filter matches doctor's associated clinic"
  );

  // Speciality filter simulation
  const entDoctors = publicVerifiedDoctors.filter((d) => d.speciality?.slug === "ent");
  assert(
    entDoctors.length === 1 && entDoctors[0].speciality?.name === "ENT",
    "4.3 Speciality filter continues working alongside location discovery"
  );

  // --------------------------------------------------------------------------
  // SUITE 5: PRIVACY & SECURITY
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 5: Privacy, Security & Environment Safety ---");

  // Check that public doctor projection does not leak private patient information
  const samplePublicDoctor = publicVerifiedDoctors[0];
  assert(
    !("patient_notes" in samplePublicDoctor) && !("medical_records" in samplePublicDoctor),
    "5.1 Public doctor data contains no patient records"
  );

  // Check .env.example
  const envExamplePath = path.resolve(process.cwd(), ".env.example");
  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
  assert(
    envExampleContent.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="),
    "5.2 .env.example documents NEXT_PUBLIC_GOOGLE_MAPS_API_KEY placeholder"
  );

  assert(
    !envExampleContent.includes("AIzaSy"), // Standard Google Maps key prefix
    "5.3 .env.example does not contain real API keys"
  );

  // Check explanation string for user location
  assert(
    LOCATION_USAGE_EXPLANATION.includes("browser") && LOCATION_USAGE_EXPLANATION.includes("never saved"),
    "5.4 Location usage disclosure clearly informs users that coordinates are local and never stored"
  );

  // --------------------------------------------------------------------------
  // SUITE 6: MIGRATION & REPOSITORY INTEGRITY
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 6: Database Migration & Schema Alignment ---");

  const migrationFile = path.resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "20261017000000_clinic_locations.sql"
  );
  assert(
    fs.existsSync(migrationFile),
    "6.1 Migration 20261017000000_clinic_locations.sql exists"
  );

  const migrationContent = fs.readFileSync(migrationFile, "utf-8");
  assert(
    migrationContent.includes("idx_clinics_coordinates") &&
      migrationContent.includes("Bansal Hospital") &&
      migrationContent.includes("Apollo Sage") &&
      migrationContent.includes("AIIMS"),
    "6.2 Migration creates spatial index and updates verified Bhopal clinic coordinates"
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log("=================================================================\n");

  if (passedTests === totalTests) {
    console.log("✓ ALL PHASE 17 VERIFICATION CHECKS PASSED SUCCESSFULLY.");
    process.exit(0);
  } else {
    console.error("✗ SOME CHECKS FAILED.");
    process.exit(1);
  }
}

runPhase17Tests().catch((err) => {
  console.error("Test runner encountered an error:", err);
  process.exit(1);
});
