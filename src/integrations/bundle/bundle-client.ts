import { Bundlesocial } from "bundlesocial";

import { getEnv } from "@/lib/env";

let cachedClient: Bundlesocial | undefined;

export function getBundleClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();

  if (!env.BUNDLE_SOCIAL_API_KEY) {
    throw new Error("BUNDLE_SOCIAL_API_KEY is not configured");
  }

  cachedClient = new Bundlesocial(env.BUNDLE_SOCIAL_API_KEY);

  return cachedClient;
}
