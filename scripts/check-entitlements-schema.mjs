import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

// Read-only schema preflight. Never print credentials or fetch client records.
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || /mock|placeholder/.test(url)) throw new Error("A real Supabase project must be configured locally.");
const database = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
let failed = false;
for (const [table, column] of [["companies", "free_client_ids"], ["companies", "pro_client_ids"], ["checkins", "coach_feedback"]]) {
  const { error } = await database.from(table).select(column).limit(0);
  const code = error?.code || (error ? "CONNECTION_OR_SCHEMA_ERROR" : null);
  console.log(`${table}.${column}: ${code ? `NOT VERIFIED (${code})` : "AVAILABLE"}`);
  if (error) failed = true;
}
console.log("Column availability only; database constraints and live payment behavior require separate verification.");
if (failed) process.exitCode = 1;
