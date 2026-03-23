import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
});

const serviceRoleSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const emailConfigSchema = z.object({
  APP_BASE_URL: z.string().url().optional(),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().min(1).optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;

export function hasServerEnv() {
  return serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  }).success;
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  });
}

export function hasSupabaseServiceRoleKey() {
  return serviceRoleSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).success;
}

export function getSupabaseServiceRoleKey() {
  return serviceRoleSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).SUPABASE_SERVICE_ROLE_KEY;
}

export function hasCronSecret() {
  return typeof process.env.CRON_SECRET === "string" && process.env.CRON_SECRET.length > 0;
}

export function getEmailConfig(): EmailConfig {
  return emailConfigSchema.parse({
    APP_BASE_URL: process.env.APP_BASE_URL,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  });
}
