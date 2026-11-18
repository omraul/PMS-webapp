import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client. Uses the service-role key, so it must NEVER be imported in a client component.
// Authorization is enforced in our server code (lib/me.ts + checks in each page/action).
let client: SupabaseClient | null = null;
export function db() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}
