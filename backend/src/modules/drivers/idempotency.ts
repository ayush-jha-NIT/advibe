import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { HttpError } from "../../lib/http-error.js";
import { serializableTransaction } from "../../db/transaction.js";
import type { AuthPrincipal } from "../auth/policy.js";

function requestHash(method: string, path: string, input: unknown): string {
  return createHash("sha256").update(JSON.stringify([method, path, input])).digest("hex");
}

/**
 * Record + resource change commit in one SERIALIZABLE transaction.
 * On duplicate request return original resource, never repeat the write.
 * An in-flight/conflicting key cannot be reinterpreted as another request.
 */
export async function executeIdempotent(
  db: PrismaClient, principal: AuthPrincipal, key: string | undefined,
  path: string, method: string, input: unknown,
  operation: (tx: Prisma.TransactionClient) => Promise<string>,
): Promise<{ resourceId: string; replayed: boolean }> {
  if (!key || !/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(key)) {
    throw new HttpError(422, "IDEMPOTENCY_REQUIRED", "Valid Idempotency-Key required (8-128 characters)");
  }
  const digest = requestHash(method, path, input);
  const where = { actorScope_requestPath_key: {
    actorScope: principal.userId, requestPath: path, key,
  } };
  try {
    const resourceId = await serializableTransaction(db, async tx => {
      const record = await tx.idempotencyRecord.create({ data: {
        actorScope: principal.userId, requestPath: path, key, requestHash: digest,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        state: "IN_PROGRESS",
      } });
      const id = await operation(tx);
      await tx.idempotencyRecord.update({ where: { id: record.id }, data: {
        resourceId: id, state: "COMPLETED", responseCode: 201,
      } });
      return id;
    });
    return { resourceId, replayed: false };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002") throw error;
    const prior = await db.idempotencyRecord.findUnique({ where });
    if (!prior) throw new HttpError(409, "RESOURCE_CONFLICT", "Resource already exists or active draft present");
    if (prior.requestHash !== digest) {
      throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "Idempotency-Key cannot be reused for different input");
    }
    if (prior.state !== "COMPLETED" || !prior.resourceId) {
      throw new HttpError(409, "IDEMPOTENCY_IN_PROGRESS", "Request in progress; retry with the same key");
    }
    return { resourceId: prior.resourceId, replayed: true };
  }
}
