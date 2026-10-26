import { createHash } from "node:crypto";
import { type PrismaClient } from "@prisma/client";
import { serializableTransaction } from "../../db/transaction.js";
import { HttpError } from "../../lib/http-error.js";
import { sniffMime } from "./schemas.js";
import type { CreativeMediaProcessor } from "./processor.js";
import type { PrivateCreativeStorage } from "./storage.js";

export async function processOneCreative(db:PrismaClient,storage:PrivateCreativeStorage,
  processor:CreativeMediaProcessor):Promise<{id:string;state:"ready"|"rejected"}|null>{
  const pending=await db.mediaAsset.findFirst({where:{state:"UPLOADED",processAttempts:{lt:3}},
    orderBy:[{uploadedAt:"asc"},{id:"asc"}]});
  if(!pending)return null;
  const claimed=await db.mediaAsset.updateMany({where:{
    id:pending.id,state:"UPLOADED",processAttempts:pending.processAttempts},
    data:{state:"PROCESSING",processAttempts:{increment:1}}});
  if(claimed.count!==1)return null;
  try{
    if(!pending.sourceVersionId||!pending.uploadedAt)
      throw new HttpError(422,"MEDIA_NOT_UPLOADED","Missing versioned source");
    const latest=await storage.head(pending.sourceKey);
    if(latest.versionId!==pending.sourceVersionId||
       latest.sizeBytes!==pending.expectedBytes||latest.contentType!==pending.mimeType)
      throw new HttpError(422,"MEDIA_SOURCE_CHANGED","Unverified media version changed");
    const bytes=await storage.readVersion(pending.sourceKey,pending.sourceVersionId,
      pending.expectedBytes);
    const digest=createHash("sha256").update(bytes).digest("hex");
    if(bytes.length!==pending.expectedBytes||digest!==pending.expectedSha256||
       sniffMime(bytes)!==pending.mimeType)
      throw new HttpError(422,"MEDIA_INTEGRITY","Source media checksum or format invalid");
    const processed=await processor.convert(bytes,pending.mimeType);
    if((pending.mimeType==="video/mp4" && (processed.mimeType!=="video/mp4" || processed.durationMs===null)) ||
       (pending.mimeType!=="video/mp4" && (processed.mimeType!=="image/png" || processed.durationMs!==null)) ||
       processed.width<1||processed.width>8192||
       processed.height<1||processed.height>8192||
       processed.bytes.length<16||processed.bytes.length>104857600||
       sniffMime(processed.bytes)!==processed.mimeType||
       (processed.durationMs!==null&&
         (processed.durationMs<1||processed.durationMs>60000)))
      throw new HttpError(422,"MEDIA_OUTPUT_INVALID","Processed output not acceptable");
    const outputKey="creative-processed/"+pending.businessId+"/"+pending.id+"/v1";
    const written=await storage.writeProcessed(outputKey,processed.mimeType,processed.bytes);
    if(written.sizeBytes!==processed.bytes.length||
       written.contentType!==processed.mimeType||!written.versionId)
      throw new HttpError(422,"MEDIA_OUTPUT_INVALID","Processed output not versioned");
    const outputDigest=createHash("sha256").update(processed.bytes).digest("hex");
    await serializableTransaction(db,async tx=>{
      const count=await tx.mediaAsset.updateMany({where:{id:pending.id,state:"PROCESSING",
        sourceVersionId:pending.sourceVersionId},data:{
        state:"READY",sourceSha256:digest,scannedAt:new Date(),processedAt:new Date(),
        processedKey:outputKey,processedVersionId:written.versionId,
        processedSha256:outputDigest,processedMimeType:processed.mimeType,
        width:processed.width,height:processed.height,durationMs:processed.durationMs,
      }});
      if(count.count!==1)throw new HttpError(409,"MEDIA_STATE_CONFLICT","State changed");
      await tx.outboxEvent.create({data:{aggregateType:"media_asset",
        aggregateId:pending.id,eventType:"creative.media_ready",
        payload:{assetId:pending.id,businessId:pending.businessId}}});
    });
    return {id:pending.id,state:"ready"};
  }catch(error){
    // Fail closed; errors are not exposed to advertisers or logged with file content.
    const code=error instanceof HttpError?error.code:"PROCESSING_FAILED";
    await db.mediaAsset.updateMany({where:{id:pending.id,state:"PROCESSING"},
      data:{state:"REJECTED",failureCode:code}});
    return {id:pending.id,state:"rejected"};
  }
}
