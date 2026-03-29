import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_SIGN_IN_URL: z.string().min(1).optional(),
  CLERK_SIGN_UP_URL: z.string().min(1).optional(),
  DEV_AUTH_BYPASS: z.string().optional(),
  DEV_AUTH_EMAIL: z.string().email().optional(),
  DEV_AUTH_NAME: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  BUNDLE_SOCIAL_API_KEY: z.string().min(1).optional(),
  BUNDLE_SOCIAL_WEBHOOK_SECRET: z.string().min(1).optional(),
  TRIGGER_SECRET_KEY: z.string().min(1).optional(),
  TRIGGER_PROJECT_REF: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  PLATFORM_ADMIN_EMAILS: z.string().optional(),
});

export function getEnv() {
  return envSchema.parse(process.env);
}

export function getPublicEnvironmentSnapshot() {
  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    return {
      configured: false,
      issues: env.error.issues.map((issue) => issue.path.join(".")),
    };
  }

  return {
    configured: true,
    hasDatabaseUrl: Boolean(env.data.DATABASE_URL),
    hasClerkKey: Boolean(env.data.CLERK_PUBLISHABLE_KEY),
    hasOpenAiKey: Boolean(env.data.OPENAI_API_KEY),
    hasBundleKey: Boolean(env.data.BUNDLE_SOCIAL_API_KEY),
    hasTriggerKey: Boolean(env.data.TRIGGER_SECRET_KEY),
    hasTriggerProjectRef: Boolean(env.data.TRIGGER_PROJECT_REF),
  };
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function isClerkConfigured() {
  return Boolean(
    process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

export function isDevelopmentAuthEnabled() {
  return (
    process.env.DEV_AUTH_BYPASS === "true" ||
    (!isClerkConfigured() && process.env.NODE_ENV !== "production")
  );
}

export function getDevelopmentAuthIdentity() {
  return {
    email: process.env.DEV_AUTH_EMAIL ?? "local-admin@growth-agent.dev",
    name: process.env.DEV_AUTH_NAME ?? "Local Admin",
  };
}

export function isBundleConfigured() {
  return Boolean(process.env.BUNDLE_SOCIAL_API_KEY);
}

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getPlatformAdminEmails() {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";

  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isTriggerConfigured() {
  return Boolean(process.env.TRIGGER_SECRET_KEY && process.env.TRIGGER_PROJECT_REF);
}
