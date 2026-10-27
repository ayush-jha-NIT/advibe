import { createApp } from "./app.js";
import { releaseGate } from "./ops/release.js";
import { loadConfig } from "./config/env.js";
import { assertDatabaseReady, createDatabase } from "./db/client.js";
import { createLogger } from "./lib/logger.js";
import { createResendSender } from "./modules/auth/email.js";
import { loadAuthSettings } from "./modules/auth/settings.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const release = releaseGate(process.env);
  const logger = createLogger(config);
  const authSettings = loadAuthSettings(process.env, config);
  const db = createDatabase();
  try {
    // Fail closed before opening an HTTP port if the database is unreachable.
    await db.$connect();
    await assertDatabaseReady(db);
  } catch {
    await db.$disconnect();
    throw new Error("Database is unavailable or misconfigured");
  }

  const app = createApp(config, logger, () => assertDatabaseReady(db), {
    db, settings: authSettings, sender: createResendSender(authSettings),
  });
  const server = app.listen(config.port, config.host, () => {
    logger.info({ host: config.host, port: config.port, environment: config.nodeEnv, releaseStage: release.mode },
      "AdVibe B2 database-backed API listening");
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.on("error", () => {
    logger.fatal("HTTP listener failure");
    process.exitCode = 1;
  });

  let shuttingDown = false;
  function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;
    app.locals.ready = false;
    logger.info({ signal }, "Stopping API server");
    const timeout = setTimeout(() => {
      logger.error("Shutdown deadline exceeded");
      process.exit(1);
    }, 10_000);
    timeout.unref();
    server.close(async error => {
      clearTimeout(timeout);
      try { await db.$disconnect(); }
      catch { process.exitCode = 1; }
      if (error) process.exitCode = 1;
    });
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(error => {
  const message = error instanceof Error && (
    error.message.startsWith("Invalid backend environment configuration") ||
    error.message.startsWith("Production requires explicit CORS_ORIGINS") ||
    error.message.startsWith("DATABASE_URL") ||
    error.message.startsWith("DIRECT_URL")
  ) ? error.message : "AdVibe backend startup failed: verify database configuration and connectivity";
  process.stderr.write(message + "\n");
  process.exitCode = 1;
});
