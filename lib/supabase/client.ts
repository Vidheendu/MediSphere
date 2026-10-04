import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a reusable client-side Supabase instance.
 * Utilizes NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */
export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn(
      "[MediSphere] Supabase environment variables are not set. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env.local file."
    );
  }

  clientInstance = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabasePublishableKey || "placeholder-key"
  );

  return clientInstance;
}

export const supabase = getSupabaseClient();
