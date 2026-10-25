import { z } from "zod";

/** Discriminated schemas stop clients writing other steps, review state or KYC decisions. */
export const driverStepInput = z.discriminatedUnion("step", [
  z.strictObject({
    step: z.literal(1), expectedVersion: z.int().min(0),
    city: z.string().trim().min(2).max(100),
    experience: z.enum(["new", "under_one", "one_to_three", "over_three"]),
  }),
  z.strictObject({
    step: z.literal(2), expectedVersion: z.int().min(0),
    vehicleId: z.uuid(), vehicleCategory: z.enum(["bike", "auto", "car"]),
  }),
  z.strictObject({
    step: z.literal(3), expectedVersion: z.int().min(0),
    screenChoice: z.string().trim().min(2).max(80),
  }),
  z.strictObject({
    step: z.literal(4), expectedVersion: z.int().min(0),
    agreementTemplateVersion: z.string().trim().min(1).max(100),
  }),
  z.strictObject({
    step: z.literal(5), expectedVersion: z.int().min(0),
    confirmedReadiness: z.literal(true),
  }),
]);
export const vehicleInput = z.strictObject({
  type: z.enum(["bike", "auto", "car"]),
  model: z.string().trim().min(1).max(100),
  year: z.int().min(1990).max(new Date().getUTCFullYear() + 1),
  // Explicit opaque provider token; never accept/store bare plate or RC number.
  registrationToken: z.string().regex(/^veh_tok_[a-zA-Z0-9_-]{16,120}$/).optional(),
});
export type DriverStepInput = z.output<typeof driverStepInput>;
export type VehicleInput = z.output<typeof vehicleInput>;
