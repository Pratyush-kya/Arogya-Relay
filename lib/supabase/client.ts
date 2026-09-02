import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  role: "admin" | "doctor" | "health_worker" | "reviewer" | "patient" | "caregiver";
  display_name: string | null;
  pseudo_id: string;
};

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase browser environment variables are not configured.");
  }

  browserClient = createSupabaseClient(supabaseUrl, publishableKey);
  return browserClient;
}
