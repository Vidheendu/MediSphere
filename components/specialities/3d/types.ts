import { CANONICAL_SPECIALITIES } from "@/lib/services/specialities";

export interface Speciality3DData {
  id: string;
  name: string;
  slug: string;
  description: string;
  index: number;
  badgeNumber: string;
  accentColor: string;
  glowColor: string;
  emissiveColor: string;
  tagline: string;
  focusAreas: string[];
}

export const SPECIALITIES_3D_CONFIG: Speciality3DData[] = [
  {
    id: "spec-cardiology",
    name: "Cardiology",
    slug: "cardiology",
    description:
      CANONICAL_SPECIALITIES.find((s) => s.slug === "cardiology")?.description ||
      "Cardiovascular health, ECG monitoring, heart assessments, and blood pressure care.",
    index: 0,
    badgeNumber: "01",
    accentColor: "#f43f5e", // Rose/Crimson
    glowColor: "#fb7185",
    emissiveColor: "#be123c",
    tagline: "Heart & Cardiovascular Care",
    focusAreas: ["ECG Monitoring", "Hypertension", "Heart Health"],
  },
  {
    id: "spec-neurology",
    name: "Neurology",
    slug: "neurology",
    description:
      CANONICAL_SPECIALITIES.find((s) => s.slug === "neurology")?.description ||
      "Nerve, spine, and brain consultations for persistent headaches and neurological health.",
    index: 1,
    badgeNumber: "02",
    accentColor: "#818cf8", // Indigo/Electric
    glowColor: "#a5b4fc",
    emissiveColor: "#4f46e5",
    tagline: "Brain, Nerves & Spine Consultations",
    focusAreas: ["Chronic Migraines", "Nerve Pathways", "Neuromuscular Health"],
  },
  {
    id: "spec-orthopedics",
    name: "Orthopedics",
    slug: "orthopedics",
    description:
      CANONICAL_SPECIALITIES.find((s) => s.slug === "orthopedics")?.description ||
      "Bone health, joint pain relief, spine issues, fractures, and mobility therapy.",
    index: 2,
    badgeNumber: "03",
    accentColor: "#38bdf8", // Sky/Cyan
    glowColor: "#7dd3fc",
    emissiveColor: "#0284c7",
    tagline: "Joints, Bones & Mobility Therapy",
    focusAreas: ["Joint Pain Relief", "Spine Rehabilitation", "Fracture Recovery"],
  },
  {
    id: "spec-dentistry",
    name: "Dentistry",
    slug: "dentistry",
    description:
      CANONICAL_SPECIALITIES.find((s) => s.slug === "dentistry")?.description ||
      "Oral checkups, cavity treatments, teeth cleaning, and dental procedures.",
    index: 3,
    badgeNumber: "04",
    accentColor: "#2dd4bf", // Teal/Mint
    glowColor: "#5eead4",
    emissiveColor: "#0d9488",
    tagline: "Oral Wellness & Tooth Care",
    focusAreas: ["Preventive Cleaning", "Enamel & Cavities", "Cosmetic Dentistry"],
  },
  {
    id: "spec-ent",
    name: "ENT",
    slug: "ent",
    description:
      CANONICAL_SPECIALITIES.find((s) => s.slug === "ent")?.description ||
      "Comprehensive ear, nose, throat, sinus, and hearing evaluation and treatments.",
    index: 4,
    badgeNumber: "05",
    accentColor: "#fbbf24", // Amber/Gold
    glowColor: "#fde68a",
    emissiveColor: "#d97706",
    tagline: "Ear, Nose, Throat & Sinus Health",
    focusAreas: ["Sinus Relief", "Audiology & Hearing", "Vocal & Throat Care"],
  },
  {
    id: "spec-dermatology",
    name: "Dermatology",
    slug: "dermatology",
    description:
      CANONICAL_SPECIALITIES.find((s) => s.slug === "dermatology")?.description ||
      "Skin, hair, and nail health including acne, allergies, and dermatological care.",
    index: 5,
    badgeNumber: "06",
    accentColor: "#ec4899", // Rose/Pink
    glowColor: "#f472b6",
    emissiveColor: "#db2777",
    tagline: "Skin Barrier, Hair & Dermal Health",
    focusAreas: ["Clinical Acne Care", "Allergy Diagnostics", "Hair & Scalp Health"],
  },
];
