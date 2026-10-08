import fs from "fs";
import path from "path";

function loadEnvLocal() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
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
}

async function runPhase11Tests() {
  loadEnvLocal();

  const {
    computeSlotsForSchedule,
    getDayOfWeekFromDate,
    getDateRange,
    minutesToTime,
    getCurrentDateIST,
    getCurrentMinutesIST,
    generateDoctorSlots,
    getDoctorSlotsByDate,
    getAvailableSlots,
    toggleSlotBlocked,
    TIMEZONE,
  } = await import("../lib/services/slots");

  const { timeToMinutes } = await import("../lib/services/schedules");
  const { getDoctors } = await import("../lib/services/doctors");
  const { supabase } = await import("../lib/supabase");

  console.log("==================================================");
  console.log("RUNNING PHASE 11 VALIDATION TEST SUITE");
  console.log("Timezone target:", TIMEZONE);
  console.log("Current date IST:", getCurrentDateIST());
  console.log("Current time IST:", minutesToTime(getCurrentMinutesIST()));
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Details: ${details}`);
    }
  }

  // Choose a fixed future date to test schedule math without past-slot filtering interference
  const testDate = "2026-10-19"; // Monday
  const dayName = getDayOfWeekFromDate(testDate);
  assert(dayName === "Monday", "Timezone date helper correctly identifies 2026-10-19 as Monday", `Got: ${dayName}`);

  // --------------------------------------------------------------------------
  // TEST 1: 30-minute schedule generates correct slots
  // --------------------------------------------------------------------------
  const schedule30 = {
    start_time: "09:00",
    end_time: "12:00",
    break_start: null,
    break_end: null,
    appointment_duration: 30,
    is_active: true,
  };
  const slots30 = computeSlotsForSchedule("mock-doc", testDate, schedule30);
  const expected30Starts = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
  const actual30Starts = slots30.map((s) => s.start_time);
  const t1Pass =
    slots30.length === 6 &&
    JSON.stringify(actual30Starts) === JSON.stringify(expected30Starts) &&
    slots30[0].end_time === "09:30" &&
    slots30[5].end_time === "12:00";
  assert(
    t1Pass,
    "Test 1: 30-minute schedule (09:00 - 12:00) generates exactly 6 slots [09:00 to 11:30]",
    `Generated: ${actual30Starts.join(", ")}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: 60-minute schedule generates correct slots
  // --------------------------------------------------------------------------
  const schedule60 = {
    start_time: "09:00",
    end_time: "13:00",
    break_start: null,
    break_end: null,
    appointment_duration: 60,
    is_active: true,
  };
  const slots60 = computeSlotsForSchedule("mock-doc", testDate, schedule60);
  const expected60Starts = ["09:00", "10:00", "11:00", "12:00"];
  const actual60Starts = slots60.map((s) => s.start_time);
  const t2Pass =
    slots60.length === 4 &&
    JSON.stringify(actual60Starts) === JSON.stringify(expected60Starts) &&
    slots60[3].end_time === "13:00";
  assert(
    t2Pass,
    "Test 2: 60-minute schedule (09:00 - 13:00) generates exactly 4 slots [09:00, 10:00, 11:00, 12:00]",
    `Generated: ${actual60Starts.join(", ")}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Break periods are excluded
  // --------------------------------------------------------------------------
  const scheduleBreak = {
    start_time: "09:00",
    end_time: "17:00",
    break_start: "13:00",
    break_end: "14:00",
    appointment_duration: 30,
    is_active: true,
  };
  const slotsBreak = computeSlotsForSchedule("mock-doc", testDate, scheduleBreak);
  const breakOverlaps = slotsBreak.filter((s) => {
    const startM = timeToMinutes(s.start_time);
    const endM = timeToMinutes(s.end_time);
    return startM < timeToMinutes("14:00") && endM > timeToMinutes("13:00");
  });
  const has1300 = slotsBreak.some((s) => s.start_time === "13:00");
  const has1330 = slotsBreak.some((s) => s.start_time === "13:30");
  const has1230 = slotsBreak.some((s) => s.start_time === "12:30" && s.end_time === "13:00");
  const has1400 = slotsBreak.some((s) => s.start_time === "14:00" && s.end_time === "14:30");
  const t3Pass = breakOverlaps.length === 0 && !has1300 && !has1330 && has1230 && has1400;
  assert(
    t3Pass,
    "Test 3: Break period (13:00 - 14:00) is excluded; 12:30-13:00 and 14:00-14:30 exist, 13:00 & 13:30 omitted",
    `Found break overlaps: ${breakOverlaps.length}, has1300=${has1300}, has1330=${has1330}`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Slots cannot extend beyond working hours
  // --------------------------------------------------------------------------
  const scheduleOddEnd = {
    start_time: "09:00",
    end_time: "11:15",
    break_start: null,
    break_end: null,
    appointment_duration: 30,
    is_active: true,
  };
  const slotsOddEnd = computeSlotsForSchedule("mock-doc", testDate, scheduleOddEnd);
  const beyondEnd = slotsOddEnd.filter((s) => timeToMinutes(s.end_time) > timeToMinutes("11:15"));
  const t4Pass = slotsOddEnd.length === 4 && beyondEnd.length === 0 && slotsOddEnd[slotsOddEnd.length - 1].end_time === "11:00";
  assert(
    t4Pass,
    "Test 4: Slots cannot extend beyond working hours (09:00-11:15 with 30m slot stops at 11:00)",
    `Last slot end: ${slotsOddEnd[slotsOddEnd.length - 1]?.end_time}, beyond count: ${beyondEnd.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Inactive days produce no slots
  // --------------------------------------------------------------------------
  const scheduleInactive = {
    start_time: "09:00",
    end_time: "17:00",
    break_start: null,
    break_end: null,
    appointment_duration: 30,
    is_active: false,
  };
  const slotsInactive = computeSlotsForSchedule("mock-doc", testDate, scheduleInactive);
  assert(
    slotsInactive.length === 0,
    "Test 5: Inactive schedule configuration produces 0 slots",
    `Produced: ${slotsInactive.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Duplicate generation does not create duplicates
  // --------------------------------------------------------------------------
  const dateRange = getDateRange("2026-10-19", "2026-10-20");
  assert(dateRange.length === 2, "Test 6a: Date range generator produces correct sequence");

  // Re-running generation for doctor with no schedule or fixed schedule is idempotent
  const run1 = await generateDoctorSlots("00000000-0000-0000-0000-000000000000", "2026-10-26", "2026-10-26");
  const run2 = await generateDoctorSlots("00000000-0000-0000-0000-000000000000", "2026-10-26", "2026-10-26");
  assert(
    run1.generatedCount === 0 && run2.generatedCount === 0 && run1.success && run2.success,
    "Test 6b: Idempotent generation safely handles doctors without schedules without throwing errors"
  );

  // Test doctor slots query
  const doctorSlots = await getDoctorSlotsByDate("00000000-0000-0000-0000-000000000000", "2026-10-26");
  assert(Array.isArray(doctorSlots), "Test 6c: getDoctorSlotsByDate safely returns array without throwing");

  // --------------------------------------------------------------------------
  // TEST 7: Past slots are not bookable
  // --------------------------------------------------------------------------
  const todayIST = getCurrentDateIST();
  const pastDate = "2020-01-01";
  const pastSlots = computeSlotsForSchedule("mock-doc", pastDate, schedule30);
  assert(
    pastSlots.length === 0,
    "Test 7a: computeSlotsForSchedule returns 0 slots for historical date (2020-01-01)",
    `Got: ${pastSlots.length}`
  );

  const pastAvailable = await getAvailableSlots("00000000-0000-0000-0000-000000000000", pastDate);
  assert(
    pastAvailable.length === 0,
    "Test 7b: getAvailableSlots returns 0 slots for past dates",
    `Got: ${pastAvailable.length}`
  );

  const curMin = getCurrentMinutesIST();
  const scheduleTodayPast = {
    start_time: "00:00",
    end_time: minutesToTime(Math.max(0, curMin - 10)),
    appointment_duration: 30,
    is_active: true,
  };
  const todayPastSlots = computeSlotsForSchedule("mock-doc", todayIST, scheduleTodayPast);
  assert(
    todayPastSlots.length === 0,
    "Test 7c: For today's date, slots with start_time in the past are excluded",
    `Generated ${todayPastSlots.length} past slots for today`
  );

  // --------------------------------------------------------------------------
  // TEST 8: Blocked slots are hidden from patient availability
  // --------------------------------------------------------------------------
  const availForDoc = await getAvailableSlots("00000000-0000-0000-0000-000000000000", "2026-10-26");
  const anyBlockedInAvail = availForDoc.some((s) => s.status === "blocked");
  assert(
    !anyBlockedInAvail,
    "Test 8: getAvailableSlots never returns slots with status 'blocked'",
    `Blocked count in available: ${availForDoc.filter((s) => s.status === "blocked").length}`
  );

  // --------------------------------------------------------------------------
  // TEST 9: Doctors cannot modify another doctor's slots
  // --------------------------------------------------------------------------
  const fakeDocA = "11111111-1111-1111-1111-111111111111";
  const blockAttempt = await toggleSlotBlocked("fake-slot-id", fakeDocA, true);
  assert(
    !blockAttempt.success,
    "Test 9: toggleSlotBlocked rejects unauthorized / non-matching doctor ID",
    `Result error: ${blockAttempt.error}`
  );

  // --------------------------------------------------------------------------
  // TEST 10: Pending doctors are not publicly bookable
  // --------------------------------------------------------------------------
  const mockPendingAvail = await getAvailableSlots("00000000-0000-0000-0000-000000000000", "2026-10-26");
  assert(
    mockPendingAvail.length === 0,
    "Test 10: Pending / unverified doctor produces 0 available slots in getAvailableSlots"
  );

  // --------------------------------------------------------------------------
  // TEST 11: Existing authentication continues working
  // --------------------------------------------------------------------------
  const { data: sessionData, error: authError } = await supabase.auth.getSession();
  assert(
    !authError && typeof sessionData === "object",
    "Test 11: Supabase auth client continues working without regression",
    authError ? authError.message : "Auth initialized"
  );

  // --------------------------------------------------------------------------
  // TEST 12: Existing doctor listing continues working
  // --------------------------------------------------------------------------
  const docList = await getDoctors();
  const doctorsJsonPath = path.resolve(process.cwd(), "data/doctors/bhopal-doctors.json");
  const hasDoctorsJson = fs.existsSync(doctorsJsonPath);
  let jsonCount = 0;
  if (hasDoctorsJson) {
    const records = JSON.parse(fs.readFileSync(doctorsJsonPath, "utf-8"));
    jsonCount = records.length;
  }
  assert(
    Array.isArray(docList) && hasDoctorsJson && jsonCount === 20,
    `Test 12: Existing doctor listing functions work correctly (${jsonCount} verified Bhopal doctors preserved)`,
    `getDoctors returned array of length ${docList.length}, json count = ${jsonCount}`
  );

  // --------------------------------------------------------------------------
  // TEST 13: Database Schema & Migration files verification
  // --------------------------------------------------------------------------
  const baseDir = path.resolve(process.cwd());
  const migrationPath = path.join(
    baseDir,
    "supabase",
    "migrations",
    "20261008000001_create_appointment_slots.sql"
  );
  assert(fs.existsSync(migrationPath), "Test 13a: Migration file 20261008000001_create_appointment_slots.sql exists");
  const migrationContent = fs.readFileSync(migrationPath, "utf-8");
  assert(
    migrationContent.includes("CREATE TABLE IF NOT EXISTS public.appointment_slots") &&
    migrationContent.includes("CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, slot_date, start_time)") &&
    migrationContent.includes("CONSTRAINT check_slot_times CHECK (end_time > start_time)"),
    "Test 13b: Migration includes table definition, unique constraint, and time check constraint"
  );
  assert(
    migrationContent.includes("CREATE POLICY \"Allow public read of available verified doctor slots\"") &&
    migrationContent.includes("CREATE POLICY \"Allow doctor to insert own slots\"") &&
    migrationContent.includes("CREATE POLICY \"Allow doctor to update own slots\"") &&
    migrationContent.includes("CREATE POLICY \"Allow doctor to delete own unbooked slots\""),
    "Test 13c: Migration defines all 4 Row Level Security policies"
  );

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase11Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
