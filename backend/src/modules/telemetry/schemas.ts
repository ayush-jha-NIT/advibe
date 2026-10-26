import { z } from "zod";
export const consentInput=z.strictObject({
  purposeVersion:z.string().min(3).max(100),acknowledged:z.literal(true),
});
export const empty=z.strictObject({});
export const gpsInput=z.strictObject({
  screenId:z.uuid(),consentGrantId:z.uuid(),
  events:z.array(z.strictObject({
    eventId:z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
    observedAt:z.iso.datetime({offset:true}),
    lat:z.number().finite().min(-90).max(90),lng:z.number().finite().min(-180).max(180),
    accuracyMeters:z.number().finite().min(0).max(100),
  })).min(1).max(50),
});
export const playbackInput=z.strictObject({
  screenId:z.uuid(),manifestVersion:z.int().min(1),
  events:z.array(z.strictObject({
    deviceEventId:z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
    creativeId:z.uuid(),playedAt:z.iso.datetime({offset:true}),
    durationMs:z.int().min(1000).max(60000),
  })).min(1).max(25),
});
