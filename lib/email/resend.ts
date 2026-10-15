import { Resend } from "resend";

let cachedResend: Resend | null = null;

/**
 * Returns true if the RESEND_API_KEY environment variable is configured.
 * This check is server-only.
 */
export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Retrieves or initializes the singleton Resend client.
 * Returns null if RESEND_API_KEY is not configured, avoiding runtime crashes.
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (!cachedResend) {
    cachedResend = new Resend(apiKey);
  }

  return cachedResend;
}

/**
 * Resets the cached Resend client instance. Useful for tests.
 */
export function resetResendClient(): void {
  cachedResend = null;
}

/**
 * Returns the configured sender email address.
 * Defaults to "MediSphere <onboarding@resend.dev>" if not explicitly defined.
 */
export function getSenderEmail(): string {
  const fromEnv = process.env.RESEND_FROM_EMAIL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return "MediSphere <onboarding@resend.dev>";
}

/**
 * Returns the configured application base URL for generating links in emails.
 * Defaults to "http://localhost:3000".
 */
export function getAppBaseUrl(): string {
  const url = process.env.APP_BASE_URL?.trim();
  if (url) {
    return url.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}
