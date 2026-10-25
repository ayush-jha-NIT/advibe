import { PrismaClient } from "@prisma/client";
import { loadConfig } from "../../config/env.js";
import { createDatabase } from "../../db/client.js";
import { activateAdminMfa, provisionAdminMfa } from "./mfa.js";
import { loadAuthSettings } from "./settings.js";

/**
 * Offline operator CLI only: no HTTP endpoint. Never put an authenticator
 * secret or enrollment URI into application logs, tickets or Git commits.
 */
async function main(): Promise<void> {
  const action = process.argv[2];
  const userId = process.env.ADMIN_MFA_USER_ID;
  if (!["enroll", "activate"].includes(action || "") ||
      process.env.ADMIN_MFA_OPERATOR_APPROVAL !== "verified-admin-identity" ||
      !userId || !/^[a-f0-9-]{36}$/i.test(userId)) {
    throw new Error("Operator authorization, verified Admin UUID and action required");
  }
  const config = loadConfig();
  const settings = loadAuthSettings(process.env, config);
  const db: PrismaClient = createDatabase();
  try {
    await db.$connect();
    if (action === "enroll") {
      const result = await provisionAdminMfa(db, settings, userId);
      // One-time output to trusted operator TTY. Never written to service logs.
      process.stdout.write(
        "Enroll the designated Admin's authenticator with this URI, then activate.\n" +
        result.uri + "\n",
      );
    } else {
      const code = process.env.ADMIN_MFA_CODE;
      if (!code || !/^\d{6}$/.test(code)) throw new Error("A 6-digit ADMIN_MFA_CODE is required");
      await activateAdminMfa(db, settings, userId, code);
      process.stdout.write("Admin MFA enrollment activated\n");
    }
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  // Suppress downstream DB or crypto stack traces and any credential values.
  process.stderr.write("Admin MFA operator action rejected; check authorization and configuration\n");
  process.exitCode = 1;
});
