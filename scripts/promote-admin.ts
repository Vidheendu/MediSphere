/**
 * Secure Initial Administrator Setup Script
 *
 * Usage:
 *   npx tsx scripts/promote-admin.ts <admin-email>
 *
 * Description:
 *   Elevates an existing registered user profile to the 'admin' role.
 *   This script runs with direct database access or administrative environment credentials.
 *   Never expose role elevation through a public HTTP endpoint.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();

  console.log("\n=======================================================");
  console.log("  MEDISPHERE SECURE INITIAL ADMIN PROVISIONING TOOL  ");
  console.log("=======================================================\n");

  if (!targetEmail) {
    console.error("Error: Please provide the target user's email address.\n");
    console.log("Usage: npx tsx scripts/promote-admin.ts <email@example.com>\n");
    console.log("Manual Database Alternative (Supabase SQL Editor):");
    console.log("  UPDATE public.profiles SET role = 'admin' WHERE email = '<email>';\n");
    process.exit(1);
  }

  if (!supabaseUrl) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not defined.");
    console.log("Please ensure .env.local contains your Supabase credentials.");
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log(`Looking up profile for email: ${targetEmail}...`);

  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .ilike("email", targetEmail)
    .maybeSingle();

  if (findError) {
    console.error(`Error querying profiles: ${findError.message}`);
    process.exit(1);
  }

  if (!profile) {
    console.error(`\nProfile not found for email '${targetEmail}'.`);
    console.log("Please ensure the user has first registered an account on MediSphere (/register),");
    console.log("then re-run this provisioning command.\n");
    process.exit(1);
  }

  if (profile.role === "admin") {
    console.log(`\nUser '${profile.full_name || targetEmail}' is already configured as an administrator.`);
    console.log("You can log in directly at: /admin/login\n");
    process.exit(0);
  }

  console.log(`Found profile: ${profile.full_name || "Unnamed"} (Current role: ${profile.role})`);
  console.log(`Promoting account to 'admin'...`);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      role: "admin",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error(`\nFailed to promote user: ${updateError.message}`);
    console.log("If Row Level Security blocks client elevation, run this SQL in Supabase Dashboard:");
    console.log(`  UPDATE public.profiles SET role = 'admin' WHERE id = '${profile.id}';\n`);
    process.exit(1);
  }

  console.log(`\n✓ SUCCESS! Account '${targetEmail}' has been granted 'admin' role.`);
  console.log("The administrator can now sign in at:");
  console.log("  http://localhost:3000/admin/login\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

