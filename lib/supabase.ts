import { createClient, SupabaseClient } from "@supabase/supabase-js";

// browser client
let browserClient: SupabaseClient | null = null;
export function supabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // env not configured → dashboard stays in sim mode
  if (!browserClient) browserClient = createClient(url, key);
  return browserClient;
}

// server client
export function supabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
