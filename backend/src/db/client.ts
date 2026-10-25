import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "./config.js";

export function createDatabase(env: NodeJS.ProcessEnv = process.env): PrismaClient {
  const config = loadDatabaseConfig(env);
  return new PrismaClient({
    datasources: { db: { url: config.runtimeUrl } },
    log: ["error"],
  });
}

/** Confirm the migrated identity table exists as well as the DB connection. */
export async function assertDatabaseReady(db: PrismaClient): Promise<void> {
  await db.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
}
