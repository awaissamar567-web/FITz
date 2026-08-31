import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

// Read-only preflight: never prints credentials or retrieves coach records.
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || /mock|placeholder/.test(url)) throw new Error("A real Supabase project must be configured locally.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
let failed = false;
for (const field of ["coach_years_experience", "coach_expertise", "coach_avatar_path", "coach_onboarded_at"]) {
  const { error } = await db.from("companies").select(field).limit(0);
  console.log(`companies.${field}: ${error ? `NOT READY (${error.code || "connection error"})` : "AVAILABLE"}`);
  if (error) failed = true;
}
const { data: bucket, error } = await db.storage.getBucket("coach-avatars");
const bucketReady = !error && bucket && bucket.public === false && bucket.file_size_limit === 2097152 && ["image/jpeg", "image/png", "image/webp"].every(type => bucket.allowed_mime_types?.includes(type));
console.log(`coach-avatars private storage: ${bucketReady ? "READY" : "NOT READY"}`);
if (failed || !bucketReady) process.exitCode = 1;
