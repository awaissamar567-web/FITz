export const FREE_TIER_CLIENT_LIMIT = 3;
export const PRO_TIER_CLIENT_LIMIT = 250;

export function clientCapacity(plan?: string) {
  return plan === "pro" ? PRO_TIER_CLIENT_LIMIT : FREE_TIER_CLIENT_LIMIT;
}
