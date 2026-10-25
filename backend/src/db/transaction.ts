import { Prisma, type PrismaClient } from "@prisma/client";

/** Database transactions and constraints are authoritative, not Redis locks. */
export async function serializableTransaction<T>(
  db: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2034" || attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1) + Math.random() * 30));
    }
  }
  throw new Error("Serializable transaction retry limit exceeded");
}
