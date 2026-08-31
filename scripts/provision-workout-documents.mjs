import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const bucketName = "workout-documents";
let { data: bucket, error } = await db.storage.getBucket(bucketName);
if (!bucket && String(error?.statusCode) === "404" && process.argv.includes("--apply")) {
  const created = await db.storage.createBucket(bucketName, { public: false, fileSizeLimit: 3145728, allowedMimeTypes: ["application/pdf"] });
  if (created.error) { console.log("Private workout bucket creation failed"); process.exit(1); }
  ({ data: bucket, error } = await db.storage.getBucket(bucketName));
}
const ready = !error && bucket?.public === false && bucket?.file_size_limit === 3145728 && bucket?.allowed_mime_types?.length === 1 && bucket.allowed_mime_types[0] === "application/pdf";
console.log(`workout-documents: ${ready ? "READY (private, 3 MB, PDF only)" : "NOT READY"}`);
if (!ready) process.exitCode = 1;
