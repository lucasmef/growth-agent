import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
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
    hasOpenAiKey: Boolean(env.data.OPENAI_API_KEY),
    hasBundleKey: Boolean(env.data.BUNDLE_SOCIAL_API_KEY),
    hasTriggerKey: Boolean(env.data.TRIGGER_SECRET_KEY),
    hasTriggerProjectRef: Boolean(env.data.TRIGGER_PROJECT_REF),
  };
}
