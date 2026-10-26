import { sign, type KeyObject } from "node:crypto";
import { Prisma, type DeviceCredential } from "@prisma/client";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { createCreativeStorage,type PrivateCreativeStorage } from "../creatives/storage.js";
import { deliveryEvidence } from "../delivery/eligibility.js";
import { getManifestSigner } from "./crypto.js";

type Tx=Prisma.TransactionClient;
export interface PlayerDependencies { media?:Pick<PrivateCreativeStorage,"signedGet"> }
export interface PlaylistEntry {
 campaignId:string; creativeId:string; mediaUrl:string; sha256:string; mimeType:string;
 startAt:string; endAt:string;
}
export function signPlaylist(key:KeyObject,screenId:string,version:number,expiresAt:Date,
 entries:PlaylistEntry[]){
 const unsigned={screenId,version,expiresAt:expiresAt.toISOString(),entries};
 return {...unsigned,signature:sign(null,Buffer.from(JSON.stringify(unsigned)),key).toString("base64url")};
}
/** B16 issues at most 45 seconds of server-side authorization, never verified impressions. */
export async function issuePlaylist(tx:Tx,cred:DeviceCredential,config:AppConfig,
 storage:Pick<PrivateCreativeStorage,"signedGet">=createCreativeStorage()){
 const signer=getManifestSigner(),now=new Date();
 const enabled=config.nodeEnv!=="production"||
  (process.env.DEVICE_PLAYBACK_ENABLED==="true"&&process.env.DEVICE_FLEET_APPROVED==="true");
 const windows=enabled?await tx.deliveryWindow.findMany({where:{
  screenId:cred.screenId,startsAt:{lte:now},endsAt:{gt:now},plan:{state:"ACTIVE"}},
  include:{plan:{include:{campaign:{include:{creative:{include:{asset:true}}}}}}},
  orderBy:[{startsAt:"asc"},{id:"asc"}],take:26}):[];
 if(windows.length>25)throw new HttpError(409,"PLAYER_SCHEDULE_CONFLICT",
   "Too many simultaneous delivery windows");
 const entries:PlaylistEntry[]=[];const verified=new Set<string>();
 let expiry=now.getTime()+45_000;
 for(const w of windows){
  try{
   if(!verified.has(w.planId)){
    const evidence=await deliveryEvidence(tx,w.plan.reservationHoldId,now);
    if(!evidence.windows.some(e=>e.screenId===w.screenId&&
     e.serviceDate.getTime()===w.serviceDate.getTime()&&
     e.startsAt.getTime()===w.startsAt.getTime()&&e.endsAt.getTime()===w.endsAt.getTime()))
      throw new HttpError(409,"PLAYER_WINDOW_MISMATCH","Immutable window no longer matches booking");
    verified.add(w.planId);
   }
   const creative=w.plan.campaign.creative,asset=creative.asset;
   if(creative.approval!=="APPROVED"||asset.state!=="READY"||
    !asset.processedKey||!asset.processedVersionId||!asset.processedSha256||
    !asset.processedMimeType||asset.businessId!==w.plan.businessId)
    throw new HttpError(409,"PLAYER_CREATIVE_INVALID","Processed approved media required");
   const mediaUrl=await storage.signedGet(asset.processedKey,asset.processedVersionId);
   const url=new URL(mediaUrl);
   if(url.protocol!=="https:"||url.username||url.password)
    throw new HttpError(503,"PLAYER_MEDIA_INVALID","Private media URL invalid");
   entries.push({campaignId:w.plan.campaignId,creativeId:creative.id,mediaUrl,
    sha256:asset.processedSha256,mimeType:asset.processedMimeType,
    startAt:w.startsAt.toISOString(),endAt:w.endsAt.toISOString()});
   expiry=Math.min(expiry,w.endsAt.getTime());
  }catch(err){
   // Failed media signing or any invalid entitlement always yields a signed STOP manifest.
   if(!(err instanceof Error))throw err;
   entries.length=0;break;
  }
 }
 const expiresAt=new Date(entries.length?expiry:now.getTime()+45_000);
 const prior=await tx.deviceManifestVersion.findFirst({where:{screenId:cred.screenId},
  orderBy:{version:"desc"},select:{version:true}});
 const manifest=signPlaylist(signer,cred.screenId,(prior?.version??0)+1,expiresAt,entries);
 await tx.deviceManifestVersion.create({data:{
  screenId:cred.screenId,version:manifest.version,expiresAt,
  entries:manifest.entries as unknown as Prisma.InputJsonValue,signature:manifest.signature}});
 return manifest;
}
