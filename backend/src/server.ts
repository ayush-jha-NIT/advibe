import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createLogger } from "./lib/logger.js";

function main(): void {
  const config = loadConfig();
  const logger = createLogger(config);
  const app = createApp(config, logger);
  const server = app.listen(config.port, config.host, () => {
    logger.info({ host: config.host, port: config.port, environment: config.nodeEnv },
      "AdVibe B1 API listening");
  });

  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

  server.on("error", (error: Error) => {
    logger.fatal({ message: error.message, code: error.name }, "HTTP server failed");
    process.exitCode = 1;
  });

  let shuttingDown = false;
  function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;
    app.locals.ready = false;
    logger.info({ signal }, "Stopping API server");
    const timeout = setTimeout(() => {
      logger.error("Server shutdown deadline exceeded");
      process.exit(1);
    }, 10_000);
    timeout.unref();
    server.close(error => {
      clearTimeout(timeout);
      if (error) {
        logger.error({ message: error.message }, "Server shutdown failed");
        process.exitCode = 1;
      }
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

try {
  main();
} catch (error) {
  // Env validation fails before server startup; never print secret values.
  process.stderr.write((error instanceof Error ? error.message : "Backend startup failed") + "\n");
  process.exitCode = 1;
}
