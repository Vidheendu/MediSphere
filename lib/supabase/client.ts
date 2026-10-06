import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

let clientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns a reusable client-side Supabase instance.
 * Utilizes NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (clientInstance) {
    return clientInstance;
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn(
      "[MediSphere] Supabase environment variables are not set. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env.local file."
    );
  }

  if (typeof globalThis !== "undefined" && typeof globalThis.WebSocket === "undefined") {
    // Polyfill for Node.js environments (CLI tools/scripts) where native WebSocket is not globally exposed
    // @ts-expect-error Minimal constructor to allow Supabase initialization in Node CLI runtimes
    globalThis.WebSocket = class {};
  }

  clientInstance = createClient<Database>(
    supabaseUrl || "https://placeholder.supabase.co",
    supabasePublishableKey || "placeholder-key"
  );

  return clientInstance;
}

export const supabase = getSupabaseClient();
