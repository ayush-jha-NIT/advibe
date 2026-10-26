import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router,type Request,type Response,type NextFunction } from "express";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireBusinessMembership,requireRole } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { serializableTransaction } from "../../db/transaction.js";
import { lockScreens } from "../reservations/core.js";
import { performSigned } from "../devices/routes.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { gpsPolicy } from "./privacy.js";
import { consentInput,empty,gpsInput,playbackInput } from "./schemas.js";
import { assertPlausibleFix,assertTime,distanceMeters } from "./geo.js";

const safe=(fn:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction)=>{void fn(req,res).catch(next);};
const uuid=z.uuid();
const parseId=(req:Request,field:string)=>{
 const out=uuid.safeParse(req.params[field]);
 if(!out.success)throw new HttpError(404,"NOT_FOUND","Resource not found");
 return out.data;
};
const iso=(date:Date|null)=>date?.toISOString()??null;
function consentView(g:{id:string;vehicleId:string;purposeVersion:string;grantedAt:Date;
 expiresAt:Date;revokedAt:Date|null}){
 return {id:g.id,vehicleId:g.vehicleId,purposeVersion:g.purposeVersion,
  grantedAt:g.grantedAt.toISOString(),expiresAt:g.expiresAt.toISOString(),
  revokedAt:iso(g.revokedAt)};
}
async function driver(req:Request,auth:AuthDependencies){
 const p=await resolvePrincipal(req,auth.db,auth.settings);
 requireRole(p,"DRIVER");return p;
}
async function readyTrip(tx:Prisma.TransactionClient,screenId:string,
 consentId?:string,now=new Date()){
 const screen=await tx.screen.findUnique({where:{id:screenId},
  include:{vehicle:true,location:{include:{zone:true}}}});
 if(!screen||screen.state!=="PAIRED"||screen.vehicle.verification!=="APPROVED")
  throw new HttpError(409,"GPS_SCREEN_INELIGIBLE","Verified paired screen required");
 const trip=await tx.tripSession.findFirst({where:{screenId,vehicleId:screen.vehicleId,
  endedAt:null,...(consentId?{consentGrantId:consentId}:{})},
  include:{consent:true}});
 if(!trip||trip.startedAt>now||trip.startedAt.getTime()<now.getTime()-12*3600000||
   trip.consent.revokedAt||trip.consent.expiresAt<=now||
   trip.consent.vehicleId!==screen.vehicleId||
   trip.consent.driverUserId!==screen.vehicle.driverUserId)
  throw new HttpError(409,"GPS_CONSENT_REQUIRED","Active purpose-bound trip consent required");
 return {trip,screen};
}
export function createTelemetryRouter(config:AppConfig,auth:AuthDependencies):Router{
 const db=auth.db,router=Router();
 router.post("/drivers/vehicles/:vehicleId/gps-consent",validateBody(consentInput),
  safe(async(req,res)=>{
   const p=await driver(req,auth);
   mutation(req,config,p,auth.settings.secret);
   const policy=gpsPolicy(config),vehicleId=parseId(req,"vehicleId");
   const input=consentInput.parse(req.body);
   if(input.purposeVersion!==policy)
    throw new HttpError(422,"GPS_PURPOSE_MISMATCH","Review current GPS consent purpose");
   const result=await serializableTransaction(db,async tx=>{
    const vehicle=await tx.vehicle.findFirst({where:{id:vehicleId,driverUserId:p.userId}});
    if(!vehicle)throw new HttpError(404,"NOT_FOUND","Vehicle unavailable");
    const now=new Date();
    await tx.gpsConsent.updateMany({where:{vehicleId,revokedAt:null},
     data:{revokedAt:now}});
    await tx.tripSession.updateMany({where:{vehicleId,endedAt:null},
     data:{endedAt:now}});
    const grant=await tx.gpsConsent.create({data:{
     vehicleId,driverUserId:p.userId,purposeVersion:policy,
     grantedAt:now,expiresAt:new Date(now.getTime()+24*3600000)}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"gps.consent_granted",resourceType:"vehicle",resourceId:vehicleId,
     metadata:{purposeVersion:policy,grantId:grant.id}}});
    return grant;
   });
   res.status(201).set("Cache-Control","no-store").json({data:consentView(result)});
  }));
 router.post("/drivers/vehicles/:vehicleId/gps-consent/revoke",validateBody(empty),
  safe(async(req,res)=>{
   const p=await driver(req,auth);mutation(req,config,p,auth.settings.secret);
   const vehicleId=parseId(req,"vehicleId");
   const vehicle=await db.vehicle.findFirst({where:{id:vehicleId,driverUserId:p.userId}});
   if(!vehicle)throw new HttpError(404,"NOT_FOUND","Vehicle unavailable");
   const result=await serializableTransaction(db,async tx=>{
    const now=new Date();
    const grants=await tx.gpsConsent.findMany({where:{vehicleId,revokedAt:null},
     select:{id:true}});
    await tx.gpsConsent.updateMany({where:{vehicleId,revokedAt:null},
     data:{revokedAt:now}});
    await tx.tripSession.updateMany({where:{vehicleId,endedAt:null},
     data:{endedAt:now}});
    // Delete fine-grained GPS on withdrawal. Aggregates contain no raw coordinates.
    const trips=await tx.tripSession.findMany({where:{
     consentGrantId:{in:grants.map(g=>g.id)}},select:{id:true}});
    const purged=await tx.gpsSample.deleteMany({where:{
     tripId:{in:trips.map(t=>t.id)}}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"gps.consent_revoked",resourceType:"vehicle",resourceId:vehicleId,
     metadata:{revokedGrants:grants.length,purgedSamples:purged.count}}});
    return {revokedGrants:grants.length,purgedSamples:purged.count};
   });
   res.set("Cache-Control","no-store").json({data:result});
  }));
 router.get("/drivers/vehicles/:vehicleId/gps-consent",safe(async(req,res)=>{
   const p=await driver(req,auth),vehicleId=parseId(req,"vehicleId");
   const vehicle=await db.vehicle.findFirst({where:{id:vehicleId,driverUserId:p.userId}});
   if(!vehicle)throw new HttpError(404,"NOT_FOUND","Vehicle unavailable");
   const grant=await db.gpsConsent.findFirst({where:{vehicleId},
    orderBy:{grantedAt:"desc"}});
   res.set("Cache-Control","no-store").json({data:grant?consentView(grant):null});
 }));
 router.post("/drivers/screens/:screenId/trips/start",validateBody(empty),
  safe(async(req,res)=>{
   const p=await driver(req,auth);mutation(req,config,p,auth.settings.secret);
   const policy=gpsPolicy(config),screenId=parseId(req,"screenId");
   const trip=await serializableTransaction(db,async tx=>{
    await lockScreens(tx,[screenId]);
    const s=await tx.screen.findUnique({where:{id:screenId},include:{vehicle:true,
     credential:true}});
    if(!s||s.vehicle.driverUserId!==p.userId)
     throw new HttpError(404,"NOT_FOUND","Screen unavailable");
    if(s.state!=="PAIRED"||!s.credential||s.credential.revokedAt||
     s.vehicle.verification!=="APPROVED")
     throw new HttpError(409,"GPS_SCREEN_INELIGIBLE","Verified paired screen required");
    const now=new Date();
    const grant=await tx.gpsConsent.findFirst({where:{
     vehicleId:s.vehicleId,driverUserId:p.userId,purposeVersion:policy,
     revokedAt:null,expiresAt:{gt:now}},orderBy:{grantedAt:"desc"}});
    if(!grant)throw new HttpError(409,"GPS_CONSENT_REQUIRED","Explicit active consent required");
    if(await tx.tripSession.count({where:{vehicleId:s.vehicleId,endedAt:null}}))
     throw new HttpError(409,"TRIP_ALREADY_ACTIVE","Vehicle already has an active trip");
    const made=await tx.tripSession.create({data:{
     vehicleId:s.vehicleId,screenId,consentGrantId:grant.id,startedAt:now}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"gps.trip_started",resourceType:"trip",resourceId:made.id}});
    return made;
   });
   res.status(201).set("Cache-Control","no-store").json({data:{
    id:trip.id,screenId:trip.screenId,consentGrantId:trip.consentGrantId,
    startedAt:trip.startedAt.toISOString(),endedAt:null}});
  }));
 router.post("/drivers/trips/:tripId/stop",validateBody(empty),safe(async(req,res)=>{
   const p=await driver(req,auth);mutation(req,config,p,auth.settings.secret);
   const tripId=parseId(req,"tripId");
   const result=await serializableTransaction(db,async tx=>{
    const trip=await tx.tripSession.findUnique({where:{id:tripId},
     include:{vehicle:true}});
    if(!trip||trip.vehicle.driverUserId!==p.userId)
     throw new HttpError(404,"NOT_FOUND","Trip unavailable");
    if(!trip.endedAt){
     await tx.tripSession.update({where:{id:trip.id},data:{endedAt:new Date()}});
     await tx.auditEvent.create({data:{actorUserId:p.userId,
      action:"gps.trip_stopped",resourceType:"trip",resourceId:trip.id}});
    }
    return {id:trip.id,stopped:true};
   });
   res.set("Cache-Control","no-store").json({data:result});
  }));
 router.post("/devices/trip-events",validateBody(gpsInput),safe(async(req,res)=>{
   gpsPolicy(config);
   const input=gpsInput.parse(req.body),now=new Date();
   if(new Set(input.events.map(e=>e.eventId)).size!==input.events.length)
    throw new HttpError(422,"GPS_DUPLICATE_BATCH","Duplicate event IDs");
   const receipt=await performSigned(req,db,async(tx,cred)=>{
    if(cred.screenId!==input.screenId)
     throw new HttpError(403,"DEVICE_SCREEN_MISMATCH","GPS screen mismatch");
    const {trip}=await readyTrip(tx,cred.screenId,input.consentGrantId,now);
    const previous=await tx.gpsSample.findFirst({where:{tripId:trip.id},
     orderBy:[{observedAt:"desc"},{id:"desc"}]});
    let prev:{latitude:number;longitude:number;observedAt:Date}|null=previous;
    const data:Prisma.GpsSampleCreateManyInput[]=[];
    if(await tx.gpsSample.count({where:{credentialId:cred.id,
     eventId:{in:input.events.map(e=>e.eventId)}}}))
     throw new HttpError(409,"GPS_EVENT_REPLAY","GPS event already ingested");
    for(const event of input.events){
     const observedAt=new Date(event.observedAt);assertTime(now,observedAt);
     if(observedAt<trip.startedAt||observedAt>=trip.consent.expiresAt)
      throw new HttpError(409,"GPS_OUTSIDE_CONSENT","GPS event outside consented trip");
     assertPlausibleFix(prev,{lat:event.lat,lng:event.lng,
      accuracyMeters:event.accuracyMeters,observedAt});
     data.push({id:randomUUID(),credentialId:cred.id,tripId:trip.id,
      eventId:event.eventId,observedAt,latitude:event.lat,longitude:event.lng,
      accuracyMeters:event.accuracyMeters});
     prev={latitude:event.lat,longitude:event.lng,observedAt};
    }
    await tx.gpsSample.createMany({data});
    return {accepted:data.length,tripId:trip.id};
   });
   res.status(201).set("Cache-Control","no-store").json({data:receipt});
  }));
 router.post("/devices/playback-events",validateBody(playbackInput),safe(async(req,res)=>{
   gpsPolicy(config);
   const input=playbackInput.parse(req.body),now=new Date();
   if(new Set(input.events.map(e=>e.deviceEventId)).size!==input.events.length)
    throw new HttpError(422,"PLAYBACK_DUPLICATE_BATCH","Duplicate playback ID");
   const output=await performSigned(req,db,async(tx,cred)=>{
    if(cred.screenId!==input.screenId)
     throw new HttpError(403,"DEVICE_SCREEN_MISMATCH","Playback screen mismatch");
    const {trip,screen}=await readyTrip(tx,cred.screenId,undefined,now);
    const zone=screen.location?.zone;
    if(!zone||zone.state!=="PUBLISHED")
     throw new HttpError(409,"ZONE_NOT_PUBLISHED","Published delivery zone required");
    const manifest=await tx.deviceManifestVersion.findUnique({where:{
     screenId_version:{screenId:cred.screenId,version:input.manifestVersion}}});
    if(!manifest||!Array.isArray(manifest.entries)||!manifest.entries.length||
     manifest.expiresAt<=now)
     throw new HttpError(409,"PLAYBACK_MANIFEST_INVALID","Current nonempty manifest required");
    const entries=z.array(z.strictObject({
     campaignId:z.uuid(),creativeId:z.uuid(),mediaUrl:z.string().url(),
     sha256:z.string(),mimeType:z.string(),
     startAt:z.iso.datetime({offset:true}),endAt:z.iso.datetime({offset:true}),
    })).safeParse(manifest.entries);
    if(!entries.success)
     throw new HttpError(409,"PLAYBACK_MANIFEST_INVALID","Invalid signed manifest entries");
    if(await tx.playbackProof.count({where:{credentialId:cred.id,
     eventId:{in:input.events.map(e=>e.deviceEventId)}}}))
     throw new HttpError(409,"PLAYBACK_EVENT_REPLAY","Playback event already ingested");
    const events:Prisma.PlaybackProofCreateManyInput[]=[];
    const totals=new Map<string,{campaignId:string;businessId:string;
     zoneId:string;serviceDate:Date;count:number}>();
    for(const event of input.events){
     const playedAt=new Date(event.playedAt),end=new Date(playedAt.getTime()+event.durationMs);
     assertTime(now,playedAt);
     if(playedAt<trip.startedAt||end>manifest.expiresAt||
      playedAt<manifest.createdAt||trip.consent.expiresAt<=playedAt)
      throw new HttpError(409,"PLAYBACK_OUTSIDE_TRIP","Playback outside consent/manifest");
     const authorized=entries.data.find(e=>e.creativeId===event.creativeId&&
      new Date(e.startAt)<=playedAt&&new Date(e.endAt)>=end);
     if(!authorized)
      throw new HttpError(409,"PLAYBACK_NOT_AUTHORIZED","Creative outside signed playback window");
     const window=await tx.deliveryWindow.findFirst({where:{
      screenId:cred.screenId,startsAt:{lte:playedAt},endsAt:{gte:end},
      plan:{state:"ACTIVE",campaignId:authorized.campaignId}},
      include:{plan:true}});
     if(!window||window.plan.resumedAt&&manifest.createdAt<window.plan.resumedAt)
      throw new HttpError(409,"PLAYBACK_WINDOW_INVALID","Active paid campaign evidence required");
     const heartbeat=await tx.deviceHeartbeat.findFirst({where:{
      credentialId:cred.id,manifestVersion:input.manifestVersion,playbackState:"PLAYING",
      observedAt:{gte:new Date(playedAt.getTime()-30000),
       lte:new Date(playedAt.getTime()+30000)}}});
     if(!heartbeat)throw new HttpError(409,"PLAYBACK_HEARTBEAT_REQUIRED",
      "Signed PLAYING heartbeat corroboration required");
     const fix=await tx.gpsSample.findFirst({where:{tripId:trip.id,
      observedAt:{gte:new Date(playedAt.getTime()-15000),
       lte:new Date(playedAt.getTime()+15000)}},
      orderBy:[{observedAt:"desc"},{id:"desc"}]});
     if(!fix||fix.accuracyMeters>50||
      distanceMeters(fix.latitude,fix.longitude,zone.centerLat,zone.centerLng)+
       fix.accuracyMeters>zone.radiusMeters)
      throw new HttpError(409,"PLAYBACK_LOCATION_UNVERIFIED",
       "Accurate consented point inside approved zone required");
     const bucket=new Date(Math.floor(playedAt.getTime()/30000)*30000);
     events.push({id:randomUUID(),tripId:trip.id,screenId:cred.screenId,
      credentialId:cred.id,campaignId:authorized.campaignId,creativeId:event.creativeId,
      zoneId:zone.id,manifestVersion:input.manifestVersion,
      eventId:event.deviceEventId,playedAt,durationMs:event.durationMs,slotBucket:bucket});
     const aggKey=authorized.campaignId+":"+zone.id+":"+window.serviceDate.toISOString();
     const prior=totals.get(aggKey);
     if(prior)prior.count++;
     else totals.set(aggKey,{campaignId:authorized.campaignId,
      businessId:window.plan.businessId,zoneId:zone.id,
      serviceDate:window.serviceDate,count:1});
    }
    if(await tx.playbackProof.count({where:{screenId:cred.screenId,
     slotBucket:{in:events.map(e=>new Date(e.slotBucket))}}}))
     throw new HttpError(409,"PLAYBACK_BUCKET_CONFLICT","Playback time bucket already counted");
    if(new Set(events.map(e=>new Date(e.slotBucket).toISOString())).size!==events.length)
     throw new HttpError(409,"PLAYBACK_BUCKET_CONFLICT","Multiple events for one screen bucket");
    await tx.playbackProof.createMany({data:events});
    for(const a of totals.values())await tx.exposureAggregate.upsert({
     where:{campaignId_zoneId_serviceDate_methodVersion:{
      campaignId:a.campaignId,zoneId:a.zoneId,serviceDate:a.serviceDate,methodVersion:"b17-v1"}},
     create:{id:randomUUID(),campaignId:a.campaignId,businessId:a.businessId,
      zoneId:a.zoneId,serviceDate:a.serviceDate,methodVersion:"b17-v1",
      qualifiedPlaybackCount:a.count},
     update:{qualifiedPlaybackCount:{increment:a.count}},
    });
    return {accepted:events.length,methodVersion:"b17-v1",
     classification:"qualified_device_report_only"};
   });
   res.status(201).set("Cache-Control","no-store").json({data:output});
  }));
 router.get("/campaigns/:campaignId/exposures",safe(async(req,res)=>{
   const p=await resolvePrincipal(req,db,auth.settings);
   requireRole(p,"ADVERTISER","ADMIN");
   const campaignId=parseId(req,"campaignId");
   const campaign=await db.campaign.findUnique({where:{id:campaignId}});
   if(!campaign)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
   if(p.role==="ADVERTISER")
    await requireBusinessMembership(db,p,campaign.ownerBusinessId);
   const rows=await db.exposureAggregate.findMany({where:{campaignId},
    orderBy:[{serviceDate:"desc"},{zoneId:"asc"}],take:100});
   res.set("Cache-Control","no-store").json({data:{
    campaignId,methodVersion:"b17-v1",
    classification:"qualified_device_report_only",
    verifiedHumanImpressions:0,
    qualifiedPlaybackCount:rows.reduce((sum,r)=>sum+r.qualifiedPlaybackCount,0),
    zones:rows.map(x=>({zoneId:x.zoneId,date:x.serviceDate.toISOString().slice(0,10),
     qualifiedPlaybackCount:x.qualifiedPlaybackCount})),
   }});
  }));
 return router;
}
