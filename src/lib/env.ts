import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_SIGN_IN_URL: z.string().min(1).optional(),
  CLERK_SIGN_UP_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  BUNDLE_SOCIAL_API_KEY: z.string().min(1).optional(),
  BUNDLE_SOCIAL_WEBHOOK_SECRET: z.string().min(1).optional(),
  TRIGGER_SECRET_KEY: z.string().min(1).optional(),
  TRIGGER_PROJECT_REF: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
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

export function isBundleConfigured() {
  return Boolean(process.env.BUNDLE_SOCIAL_API_KEY);
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
