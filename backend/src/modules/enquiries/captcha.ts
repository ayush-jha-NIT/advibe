import { HttpError } from "../../lib/http-error.js";

export type CaptchaVerifier = (token: string, ipAddress: string) => Promise<boolean>;

interface TurnstileResponse { success?: boolean; hostname?: string; action?: string; }

/** Turnstile credentials stay server-side. Production fails closed when unconfigured. */
export function createTurnstileVerifier(
  env: NodeJS.ProcessEnv = process.env,
): CaptchaVerifier {
  const secret = env.ENQUIRY_TURNSTILE_SECRET;
  const hostname = env.ENQUIRY_TURNSTILE_HOSTNAME;
  if (env.NODE_ENV === "production" && (!secret || !hostname)) {
    throw new Error("ENQUIRY_TURNSTILE_SECRET and ENQUIRY_TURNSTILE_HOSTNAME are required in production");
  }
  return async (token, ipAddress) => {
    if (!secret || !hostname) {
      throw new HttpError(503, "CAPTCHA_UNAVAILABLE", "Enquiry verification is temporarily unavailable");
    }
    const form = new URLSearchParams({
      secret, response: token, remoteip: ipAddress,
    });
    let response: Response;
    try {
      response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", body: form,
        signal: AbortSignal.timeout(7000),
      });
    } catch {
      throw new HttpError(503, "CAPTCHA_UNAVAILABLE", "Enquiry verification is temporarily unavailable");
    }
    if (!response.ok) {
      throw new HttpError(503, "CAPTCHA_UNAVAILABLE", "Enquiry verification is temporarily unavailable");
    }
    let result: TurnstileResponse;
    try {
      result = await response.json() as TurnstileResponse;
    } catch {
      throw new HttpError(503, "CAPTCHA_UNAVAILABLE", "Enquiry verification is temporarily unavailable");
    }
    return result.success === true && result.hostname === hostname && result.action === "enquiry";
  };
}
