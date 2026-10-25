import type { AuthSettings } from "./settings.js";
export interface AuthEmail { to: string; subject: string; text: string; }
export type EmailSender = (email: AuthEmail) => Promise<void>;
export function createResendSender(settings: AuthSettings): EmailSender {
  return async email => {
    if (!settings.resendApiKey || !settings.mailFrom) throw new Error("Email transport not configured");
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + settings.resendApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: settings.mailFrom, to: [email.to],
        subject: email.subject, text: email.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) throw new Error("Email provider rejected request");
  };
}
