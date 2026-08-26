import { createClient } from "@supabase/supabase-js";

// Client-side Supabase instance, uses anon key. Enforces RLS.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://mock-fitz.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "mock-anon-key-for-dev";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
