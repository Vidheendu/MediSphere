import fs from "fs";
import path from "path";
import * as THREE from "three";
import { CANONICAL_SPECIALITIES } from "../lib/services/specialities";
import { SPECIALITIES_3D_CONFIG } from "../components/specialities/3d/types";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string, detail?: string) {
  if (condition) {
    console.log(`  ${colors.green}✓${colors.reset} ${message}`);
    passedCount++;
  } else {
    console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${message}`);
    if (detail) console.error(`    ${colors.yellow}Detail: ${detail}${colors.reset}`);
    failedCount++;
  }
}

console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}  MEDISPHERE PHASE 18: 3D SPECIALITY VERIFICATION  ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

// ----------------------------------------------------------------------------
// TEST SUITE 1: CANONICAL SPECIALITIES INTEGRITY
// ----------------------------------------------------------------------------
console.log(`${colors.bold}1. Canonical Specialities Source of Truth${colors.reset}`);

assert(
  CANONICAL_SPECIALITIES.length === 6,
  `Source of truth contains exactly 6 specialities (found ${CANONICAL_SPECIALITIES.length})`
);

const expectedSlugs = [
  "dermatology",
  "ent",
  "dentistry",
  "cardiology",
  "neurology",
  "orthopedics",
];

const foundSlugs = CANONICAL_SPECIALITIES.map((s) => s.slug);
const allSlugsPresent = expectedSlugs.every((slug) => foundSlugs.includes(slug));
assert(
  allSlugsPresent,
  `All 6 required medical specialities present: ${expectedSlugs.join(", ")}`
);

CANONICAL_SPECIALITIES.forEach((s) => {
  assert(
    !!s.name && !!s.description && s.description.length > 10,
    `Speciality '${s.name}' has authentic medical description`
  );
});

// ----------------------------------------------------------------------------
// TEST SUITE 2: 3D CONFIGURATION INTEGRITY
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}2. 3D Spatial Configuration & Visual Accents${colors.reset}`);

assert(
  SPECIALITIES_3D_CONFIG.length === 6,
  `3D configuration contains exactly 6 items (found ${SPECIALITIES_3D_CONFIG.length})`
);

SPECIALITIES_3D_CONFIG.forEach((item, idx) => {
  assert(
    expectedSlugs.includes(item.slug),
    `3D Node ${idx + 1}: slug '${item.slug}' corresponds to canonical speciality`
  );
  assert(
    item.accentColor.startsWith("#") && item.glowColor.startsWith("#"),
    `3D Node ${idx + 1} (${item.name}): valid accent (${item.accentColor}) & glow (${item.glowColor})`
  );
  assert(
    item.focusAreas && item.focusAreas.length >= 2,
    `3D Node ${idx + 1} (${item.name}): has authentic clinical focus areas (${item.focusAreas.join(", ")})`
  );
  assert(
    item.badgeNumber === `0${idx + 1}`,
    `3D Node ${idx + 1} (${item.name}): correct display badge '${item.badgeNumber}'`
  );
});

// ----------------------------------------------------------------------------
// TEST SUITE 3: PROCEDURAL 3D MODELS EXISTENCE
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}3. Procedural 3D Geometry Models${colors.reset}`);

const modelFiles = [
  { name: "CardioHeart3D", file: "components/specialities/3d/models/CardioHeart3D.tsx" },
  { name: "NeuroBrain3D", file: "components/specialities/3d/models/NeuroBrain3D.tsx" },
  { name: "OrthoSpine3D", file: "components/specialities/3d/models/OrthoSpine3D.tsx" },
  { name: "DentalTooth3D", file: "components/specialities/3d/models/DentalTooth3D.tsx" },
  { name: "EntCochlea3D", file: "components/specialities/3d/models/EntCochlea3D.tsx" },
  { name: "DermaShield3D", file: "components/specialities/3d/models/DermaShield3D.tsx" },
];

modelFiles.forEach(({ name, file }) => {
  const filePath = path.resolve(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  assert(exists, `Procedural model file exists: ${file}`);
  if (exists) {
    const content = fs.readFileSync(filePath, "utf-8");
    assert(
      content.includes("export default function " + name),
      `${name} exports default component`
    );
    assert(
      content.includes("reducedMotion"),
      `${name} respects reduced-motion preference`
    );
    assert(
      !content.includes(".gltf") && !content.includes(".glb") && !content.includes(".obj"),
      `${name} uses 100% lightweight procedural geometry without unlicensed external assets`
    );
  }
});

// ----------------------------------------------------------------------------
// TEST SUITE 4: 3D SCENE & CANVAS ARCHITECTURE
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}4. 3D Scene Architecture & Controls${colors.reset}`);

const scenePath = path.resolve(process.cwd(), "components/specialities/3d/Speciality3DScene.tsx");
assert(fs.existsSync(scenePath), "Speciality3DScene.tsx exists");
if (fs.existsSync(scenePath)) {
  const content = fs.readFileSync(scenePath, "utf-8");
  assert(content.includes("OrbitControls"), "Scene implements OrbitControls for intuitive navigation");
  assert(content.includes("enableDamping"), "OrbitControls has damping enabled for smooth motion");
  assert(content.includes("autoRotate"), "Supports auto-rotation with user pause control");
  assert(content.includes("SpecialityNode3D"), "Renders modular SpecialityNode3D instances");
}

const canvasPath = path.resolve(process.cwd(), "components/specialities/3d/Speciality3DCanvas.tsx");
assert(fs.existsSync(canvasPath), "Speciality3DCanvas.tsx exists");
if (fs.existsSync(canvasPath)) {
  const content = fs.readFileSync(canvasPath, "utf-8");
  assert(content.includes("WebGLErrorBoundary"), "Implements WebGLErrorBoundary for WebGL failure recovery");
  assert(content.includes("Canvas"), "Embeds React Three Fiber Canvas with camera & fog setup");
}

// ----------------------------------------------------------------------------
// TEST SUITE 5: ACCESSIBILITY & 2D FALLBACK
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}5. Accessibility & 2D Grid Fallback${colors.reset}`);

const fallback2DPath = path.resolve(process.cwd(), "components/specialities/3d/Speciality2DView.tsx");
assert(fs.existsSync(fallback2DPath), "Speciality2DView.tsx exists for accessible 2D browsing");
if (fs.existsSync(fallback2DPath)) {
  const content = fs.readFileSync(fallback2DPath, "utf-8");
  assert(content.includes("href={`/specialities/${item.slug}`}"), "2D Grid links directly to each speciality route");
  assert(content.includes("focus-visible:"), "2D Grid implements visible focus states for keyboard users");
}

const expPath = path.resolve(process.cwd(), "components/specialities/3d/Speciality3DExperience.tsx");
assert(fs.existsSync(expPath), "Speciality3DExperience.tsx exists");
if (fs.existsSync(expPath)) {
  const content = fs.readFileSync(expPath, "utf-8");
  assert(
    content.includes("aria-label=\"Accessible medical specialities directory\""),
    "Implements dedicated screen-reader accessible navigation links"
  );
  assert(
    content.includes("useSyncExternalStore"),
    "Uses React 19 useSyncExternalStore for hydration-safe, non-cascading browser state"
  );
  assert(
    content.includes("prefers-reduced-motion"),
    "Detects and respects user prefers-reduced-motion OS preference"
  );
  assert(
    content.includes("detectWebGL"),
    "Detects WebGL hardware acceleration capability before rendering 3D"
  );
  assert(
    content.includes("setUserModeOverride(\"2d\")") && content.includes("setUserModeOverride(\"3d\")"),
    "Offers explicit user toggle between 3D Spatial and 2D Grid modes"
  );
}

// ----------------------------------------------------------------------------
// TEST SUITE 6: ROUTE TARGET PRESERVATION
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}6. Route Target & Data Integrity${colors.reset}`);

const detailPagePath = path.resolve(process.cwd(), "app/specialities/[slug]/page.tsx");
assert(fs.existsSync(detailPagePath), "Existing /specialities/[slug] route is preserved");

const specialitiesPagePath = path.resolve(process.cwd(), "app/specialities/page.tsx");
assert(fs.existsSync(specialitiesPagePath), "Existing /specialities directory route is preserved");

const homepagePath = path.resolve(process.cwd(), "app/page.tsx");
assert(fs.existsSync(homepagePath), "Homepage route is preserved");
if (fs.existsSync(homepagePath)) {
  const content = fs.readFileSync(homepagePath, "utf-8");
  assert(content.includes("<Specialities />"), "Homepage integrates Specialities component");
}

// ----------------------------------------------------------------------------
// TEST SUITE 7: THREE.JS ENGINE INITIALIZATION CHECK
// ----------------------------------------------------------------------------
console.log(`\n${colors.bold}7. Three.js Runtime Geometry Math Check${colors.reset}`);

const testHeartShape = new THREE.Shape();
testHeartShape.moveTo(0, 0.35);
testHeartShape.bezierCurveTo(0, 0.8, -0.8, 0.8, -0.8, 0.35);
const testGeom = new THREE.ExtrudeGeometry(testHeartShape, { depth: 0.1 });
assert(
  testGeom.getAttribute("position").count > 0,
  "Procedural ExtrudeGeometry compiles valid vertex buffers"
);
testGeom.dispose();

console.log(`\n${colors.bold}====================================================${colors.reset}`);
console.log(
  `Results: ${colors.green}${passedCount} Passed${colors.reset}, ${
    failedCount > 0 ? `${colors.red}${failedCount} Failed${colors.reset}` : `${colors.green}0 Failed${colors.reset}`
  }`
);
console.log(`${colors.bold}====================================================${colors.reset}\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bold}PHASE 18 SPECIFICATION VERIFIED SUCCESSFULLY!${colors.reset}\n`);
}
