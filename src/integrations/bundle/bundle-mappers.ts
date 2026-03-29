import type { Platform } from "@/contracts";

type BundleSocialAccountType = "INSTAGRAM" | "TIKTOK";

export function platformToBundleAccountType(
  platform: Platform,
): BundleSocialAccountType {
  if (platform === "INSTAGRAM") {
    return "INSTAGRAM";
  }

  return "TIKTOK";
}

export function bundleAccountTypeToPlatform(
  value: string,
): Platform | null {
  if (value === "INSTAGRAM") {
    return "INSTAGRAM";
  }

  if (value === "TIKTOK") {
    return "TIKTOK";
  }

  return null;
}
