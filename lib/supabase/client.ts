import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  role: "admin" | "doctor" | "health_worker" | "reviewer" | "patient" | "caregiver";
  display_name: string | null;
  pseudo_id: string;
};

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function createClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wyhputdbwuslzgipfzjm.supabase.co";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_i4H4gOhMqL_hkCioArUEPQ_owYL8smN";

  browserClient = createSupabaseClient(supabaseUrl, publishableKey);
  return browserClient;
}
