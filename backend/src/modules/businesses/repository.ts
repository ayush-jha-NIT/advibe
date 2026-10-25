import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { serializableTransaction } from "../../db/transaction.js";

const businessInput = z.strictObject({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  displayName: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(100).optional(),
  legalName: z.string().trim().min(1).max(220).optional(),
});
export type CreateBusinessInput = z.input<typeof businessInput>;

/** Atomic B2 business ownership, audit and outbox; B5 API authorizes caller. */
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

    const owned = await tx.business.count({ where: { ownerUserId, archivedAt: null } });
    if (owned >= 10) throw new Error("Maximum ten active businesses per owner");
    const business = await tx.business.create({
      data: { ownerUserId, slug: valid.slug, displayName: valid.displayName,
        city: valid.city, legalName: valid.legalName },
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
export async function listBusinessesForUser(db: PrismaClient, userId: string) {
  const memberships = await db.businessMembership.findMany({
    where: { userId, revokedAt: null, business: { archivedAt: null } },
    select: { business: true }, orderBy: { createdAt: "desc" },
  });
  return memberships.map(record => record.business);
}
