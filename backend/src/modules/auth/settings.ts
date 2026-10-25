import type { AppConfig } from "../../config/env.js";
export interface AuthSettings {
  secret: string;
  secureCookies: boolean;
  webOrigin: string;
  resendApiKey?: string;
  mailFrom?: string;
}
export function loadAuthSettings(env: NodeJS.ProcessEnv, app: AppConfig): AuthSettings {
  const secret = env.AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.length > 256) throw new Error("AUTH_SECRET must be at least 32 characters");
  const webOrigin = env.AUTH_WEB_ORIGIN || app.corsOrigins[0];
  if (!webOrigin || !app.corsOrigins.includes(webOrigin)) throw new Error("AUTH_WEB_ORIGIN must match configured CORS origin");
  if (app.nodeEnv === "production" && (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM)) {
    throw new Error("Production auth requires RESEND_API_KEY and AUTH_EMAIL_FROM");
  }
  if (env.AUTH_EMAIL_FROM && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.AUTH_EMAIL_FROM)) {
    throw new Error("AUTH_EMAIL_FROM must be an email address");
  }
  return { secret, secureCookies: app.nodeEnv === "production", webOrigin,
    resendApiKey: env.RESEND_API_KEY, mailFrom: env.AUTH_EMAIL_FROM };
}
