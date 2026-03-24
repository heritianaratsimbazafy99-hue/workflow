import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
});

const serviceRoleSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const emailProviderSchema = z.enum(["console", "resend"]);

const emailConfigSchema = z.object({
  APP_BASE_URL: z.string().trim().min(1).optional(),
  EMAIL_PROVIDER: emailProviderSchema.default("console"),
  EMAIL_FROM: z.string().trim().min(1).optional(),
  EMAIL_REPLY_TO: z.string().trim().min(1).optional(),
  RESEND_API_KEY: z.string().trim().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type EmailProvider = z.infer<typeof emailProviderSchema>;
export type EmailConfigHealth = {
  provider: EmailProvider;
  appBaseUrl: string | null;
  appBaseUrlValid: boolean;
  emailFrom: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  emailReplyToAddress: string | null;
  resendApiKeyConfigured: boolean;
  issues: string[];
  warnings: string[];
  canSendTransactionalEmail: boolean;
};

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

export function resolveAppBaseUrl(value = getEmailConfig().APP_BASE_URL) {
  const normalized = normalizeOptionalValue(value);

  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function parseConfiguredEmailAddress(value: string | null | undefined) {
  const normalized = normalizeOptionalValue(value);

  if (!normalized) {
    return null;
  }

  const bracketMatch = normalized.match(/<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>/);
  const candidate = bracketMatch?.[1] ?? normalized;

  return EMAIL_ADDRESS_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}

export function getEmailConfigHealth(): EmailConfigHealth {
  const config = getEmailConfig();
  const appBaseUrl = normalizeOptionalValue(config.APP_BASE_URL) ?? null;
  const emailFrom = normalizeOptionalValue(config.EMAIL_FROM) ?? null;
  const emailReplyTo = normalizeOptionalValue(config.EMAIL_REPLY_TO) ?? null;
  const appBaseUrlResolved = resolveAppBaseUrl(appBaseUrl ?? undefined);
  const emailFromAddress = parseConfiguredEmailAddress(emailFrom);
  const emailReplyToAddress = parseConfiguredEmailAddress(emailReplyTo);
  const resendApiKeyConfigured = Boolean(normalizeOptionalValue(config.RESEND_API_KEY));
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!appBaseUrl) {
    warnings.push("APP_BASE_URL absent: les liens directs des emails seront masqués.");
  } else if (!appBaseUrlResolved) {
    issues.push("APP_BASE_URL invalide.");
  }

  if (!emailFrom) {
    issues.push("EMAIL_FROM absent.");
  } else if (!emailFromAddress) {
    issues.push("EMAIL_FROM invalide.");
  }

  if (!emailReplyTo) {
    warnings.push("EMAIL_REPLY_TO absent: les réponses email ne seront pas routées vers une boîte dédiée.");
  } else if (!emailReplyToAddress) {
    issues.push("EMAIL_REPLY_TO invalide.");
  }

  if (config.EMAIL_PROVIDER === "resend" && !resendApiKeyConfigured) {
    issues.push("RESEND_API_KEY absent alors que EMAIL_PROVIDER=resend.");
  }

  return {
    provider: config.EMAIL_PROVIDER,
    appBaseUrl,
    appBaseUrlValid: Boolean(appBaseUrlResolved),
    emailFrom,
    emailFromAddress,
    emailReplyTo,
    emailReplyToAddress,
    resendApiKeyConfigured,
    issues,
    warnings,
    canSendTransactionalEmail:
      config.EMAIL_PROVIDER === "console"
        ? Boolean(emailFromAddress)
        : Boolean(emailFromAddress && resendApiKeyConfigured && (!emailReplyTo || emailReplyToAddress)),
  };
}

function normalizeOptionalValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

const EMAIL_ADDRESS_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
