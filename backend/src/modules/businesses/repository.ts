import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { serializableTransaction } from "../../db/transaction.js";

const businessInput = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  displayName: z.string().trim().min(1).max(180),
}).strict();

export type CreateBusinessInput = z.input<typeof businessInput>;

/** B2 repository only. No public signup or role authorization before B3-B5. */
export async function createOwnedBusiness(
  db: PrismaClient,
  ownerUserId: string,
  input: CreateBusinessInput,
) {
  const valid = businessInput.parse(input);
  return serializableTransaction(db, async tx => {
    const owner = await tx.user.findUnique({
      where: { id: ownerUserId },
      select: { id: true, status: true },
    });
    if (!owner || owner.status === "CLOSED") throw new Error("Owner account unavailable");
    const business = await tx.business.create({
      data: { ownerUserId, slug: valid.slug, displayName: valid.displayName },
    });
    await tx.businessMembership.create({
      data: { businessId: business.id, userId: ownerUserId, role: "OWNER" },
    });
    await tx.auditEvent.create({
      data: { actorUserId: ownerUserId, action: "business.created",
        resourceType: "business", resourceId: business.id },
    });
    await tx.outboxEvent.create({
      data: { aggregateType: "business", aggregateId: business.id,
        eventType: "business.created", payload: { businessId: business.id } },
    });
    return business;
  });
}

/** B5 will derive userId from the authenticated session, never a request body. */
export async function listBusinessesForUser(db: PrismaClient, userId: string) {
  const memberships = await db.businessMembership.findMany({
    where: { userId, revokedAt: null },
    select: { business: true },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map(record => record.business);
}
