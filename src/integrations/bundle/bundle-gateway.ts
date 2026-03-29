import type {
  BundleCreatePostInput,
  BundlePostResult,
} from "@/contracts";

import { getEnv } from "@/lib/env";

const BUNDLE_BASE_URL = "https://api.bundle.social";

async function bundleFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const env = getEnv();

  const response = await fetch(`${BUNDLE_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.BUNDLE_SOCIAL_API_KEY ?? ""}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Bundle API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function createBundlePost(
  input: BundleCreatePostInput,
): Promise<BundlePostResult> {
  return bundleFetch<BundlePostResult>("/v1/post", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
