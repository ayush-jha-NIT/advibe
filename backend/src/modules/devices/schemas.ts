import { z } from "zod";
export const provisionInput=z.strictObject({
  vehicleId:z.uuid(),
  placement:z.enum(["bike_rear","auto_rear","auto_side","car_rear","car_interior","helmet"]),
  installationReference:z.string().trim().min(8).max(120),
});
export const challengeInput=z.strictObject({
  screenId:z.uuid(),
  publicKeySpki:z.string().min(54).max(180),
});
export const pairInput=z.strictObject({
  challengeId:z.uuid(),signature:z.string().regex(/^[A-Za-z0-9_-]{86}$/),
});
export const heartbeatInput=z.strictObject({
  screenId:z.uuid(),
  deviceEventId:z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
  observedAt:z.iso.datetime({offset:true}),
  firmwareVersion:z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/),
});
