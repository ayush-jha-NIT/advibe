import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../../lib/http-error.js";
import { mac } from "./security.js";
import type { AuthSettings } from "./settings.js";
/** PostgreSQL atomic rate increments shared across API instances. */
export async function takeAuthRateSlot(
  db: PrismaClient, settings: AuthSettings, group: string, identity: string,
  limit: number, windowSeconds: number,
): Promise<void> {
  const scope = mac(settings, "throttle:" + group, identity);
  const rows = await db.$queryRaw<Array<{ hits: number }>>`
    INSERT INTO "AuthThrottle" ("scope", "hits", "resetAt", "updatedAt")
    VALUES (${scope}, 1, NOW() + (${windowSeconds} * interval '1 second'), NOW())
    ON CONFLICT ("scope") DO UPDATE SET
      "hits" = CASE WHEN "AuthThrottle"."resetAt" <= NOW()
          THEN 1 ELSE "AuthThrottle"."hits" + 1 END,
      "resetAt" = CASE WHEN "AuthThrottle"."resetAt" <= NOW()
          THEN NOW() + (${windowSeconds} * interval '1 second')
          ELSE "AuthThrottle"."resetAt" END,
      "updatedAt" = NOW()
    RETURNING "hits"
  `;
  if ((rows[0]?.hits ?? limit + 1) > limit) {
    throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Try again later");
  }
}
