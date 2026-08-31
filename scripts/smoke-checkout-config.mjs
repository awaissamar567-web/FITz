import nextEnv from "@next/env";
import { WhopClient } from "@whop/sdk";
import fs from "node:fs";
import vm from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";

// Creates one checkout configuration for the developer's FITz workspace only.
// Does not create/update a plan, initiate a charge or grant any entitlement.
nextEnv.loadEnvConfig(process.cwd());
const companyId = "biz_lapNW4qSKZlOA5";
const code = ts.transpileModule(fs.readFileSync("lib/billing-checkout.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
vm.runInNewContext(code, { module, exports: module.exports, process, Buffer, require: name => { if (name !== "node:crypto") throw new Error("Unexpected dependency"); return crypto; } });
const client = new WhopClient({ token: process.env.WHOP_API_KEY });
try {
  const appId = process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const checkout = await client.checkoutConfigurations.create({
    plan_id: process.env.WHOP_PRO_PLAN_ID, mode: "payment",
    redirect_url: `https://whop.com/dashboard/${companyId}/apps/${appId}/`,
    metadata: module.exports.checkoutMetadata(companyId, process.env.WHOP_PRO_PLAN_ID),
  });
  console.log(JSON.stringify({ checkoutCreated: Boolean(checkout.id), existingPlanMatched: checkout.plan?.id === process.env.WHOP_PRO_PLAN_ID, workspaceBindingReturned: module.exports.checkoutCompany(checkout.metadata, process.env.WHOP_PRO_PLAN_ID) === companyId }));
} catch (error) {
  console.log(JSON.stringify({ checkoutCreated: false, status: error.statusCode || error.status || "connection-error", permissionNames: [...new Set((JSON.stringify(error.body || {}) + String(error.message)).match(/[a-z_]+:[a-z_:]+/g) || [])] }));
  process.exitCode = 1;
}
