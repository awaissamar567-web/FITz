import { WhopClient } from "@whop/sdk";

export const whopClient = new WhopClient({
  token: process.env.WHOP_API_KEY || "",
  baseUrl: process.env.WHOP_BASE_URL || undefined,
});

export const whopsdk = whopClient;
