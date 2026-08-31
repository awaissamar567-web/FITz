import nextEnv from "@next/env";
import { WhopClient } from "@whop/sdk";

// Read-only: no charges, plan mutations, credential output or payment details.
nextEnv.loadEnvConfig(process.cwd());
if (process.env.WHOP_BASE_URL && new URL(process.env.WHOP_BASE_URL).hostname !== "api.whop.com") throw new Error("Production Whop API host is invalid");
const client = new WhopClient({ token: process.env.WHOP_API_KEY, baseUrl: process.env.WHOP_BASE_URL || undefined });
try {
  const plan = await client.plans.retrieve({ id: process.env.WHOP_PRO_PLAN_ID });
  console.log(JSON.stringify({ planReadable: true, configuredPlanMatches: plan.id === process.env.WHOP_PRO_PLAN_ID, visibility: plan.visibility, planType: plan.plan_type, initialPrice: plan.initial_price, renewalPrice: plan.renewal_price, billingPeriod: plan.billing_period, webhookSecretConfigured: Boolean(process.env.WHOP_WEBHOOK_SECRET), productionApi: true }));
  const app = await client.apps.retrieve({ id: process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID });
  // Explicit allowlist: app responses may also contain credentials. Never log them.
  console.log(JSON.stringify({ appId: app.id, appType: app.app_type, status: app.status, marketplaceStatus: app.marketplace_status, baseUrl: app.base_url, dashboardPath: app.dashboard_path, experiencePath: app.experience_path, discoverPath: app.discover_path }));
} catch (error) {
  console.log(JSON.stringify({ configurationCheckFailed: true, status: error.statusCode || error.status || "connection-error" }));
  process.exitCode = 1;
}
