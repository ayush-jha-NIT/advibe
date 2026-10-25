import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "../src/db/config.js";

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "development" || process.env.DEV_SEED_ACK !== "true") {
    throw new Error("Development seeding requires NODE_ENV=development and DEV_SEED_ACK=true");
  }
  const urls = loadDatabaseConfig();
  const host = new URL(urls.runtimeUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("Refusing to seed a non-local database");
  }
  const db = new PrismaClient();
  try {
    // Reserved example.invalid domain, deliberately no login password, no KYC or money.
    const user = await db.user.upsert({
      where: { email: "demo-advertiser@example.invalid" },
      update: {},
      create: {
        email: "demo-advertiser@example.invalid",
        displayName: "Development-only Advertiser",
        status: "PENDING",
      },
    });
    const business = await db.business.upsert({
      where: { slug: "dev-fixture-only" },
      update: {},
      create: {
        ownerUserId: user.id,
        slug: "dev-fixture-only",
        displayName: "DEVELOPMENT FIXTURE (not actual inventory)",
      },
    });
    await db.businessMembership.upsert({
      where: { businessId_userId: { businessId: business.id, userId: user.id } },
      update: {},
      create: { businessId: business.id, userId: user.id, role: "OWNER" },
    });
    process.stdout.write("B2 development-only fixture installed; no login credentials exist\n");
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  process.stderr.write("Development seeding blocked or failed\n");
  process.exitCode = 1;
});
