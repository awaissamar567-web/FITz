import { Whop } from "@whop/app-sdk";

const appId = process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID || "";

/**
 * Whop's iframe-app SDK. This is kept separate from the general API client in
 * whop-sdk.ts because the two official SDK release lines expose different APIs.
 */
export const whopAppSdk = new Whop({
  appID: appId,
  apiKey: process.env.WHOP_API_KEY || "",
});
