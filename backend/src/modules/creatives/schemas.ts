import { z } from "zod";
export const uuid=z.uuid();
export const uploadInput=z.strictObject({
  businessId:uuid,contentType:z.enum(["image/png","image/jpeg","video/mp4"]),
  sizeBytes:z.int().min(16).max(104857600),
  sha256:z.string().regex(/^[a-f0-9]{64}$/),
});
export const creativeInput=z.strictObject({
  businessId:uuid,title:z.string().trim().min(1).max(180),
  placement:z.enum(["bike_rear","auto_rear","auto_side","car_rear","car_interior","helmet"]),
  mediaAssetId:uuid,
});
export const reviewInput=z.strictObject({
  decision:z.enum(["approved","rejected"]),reason:z.string().trim().min(10).max(1000),
});
export function sniffMime(bytes:Buffer):string|null {
  if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    return "image/png";
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)
    return "image/jpeg";
  if(bytes.length>=12&&bytes.toString("ascii",4,8)==="ftyp")
    return "video/mp4";
  return null;
}
