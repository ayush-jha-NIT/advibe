import { Prisma, type PrismaClient } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { serializableTransaction } from "../../db/transaction.js";
import type { AuthDependencies } from "../auth/routes.js";
import { requireRole, resolvePrincipal, type AuthPrincipal } from "../auth/policy.js";
import { constantTimeHexMatch, mac } from "../auth/security.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { cityInput, cityUpdate, locationInput, locationUpdate,
  metersBetween, screenLocationInput, uuid, validTimeZone, zoneInput, zoneUpdate } from "./schemas.js";
import { listGeo } from "./query.js";

const route=(h:(req:Request,res:Response)=>Promise<void>)=>
  (req:Request,res:Response,next:NextFunction):void=>{void h(req,res).catch(next);};
const identifier=(req:Request,key:string)=>{
  const result=uuid.safeParse(req.params[key]);
  if(!result.success)throw new HttpError(404,"NOT_FOUND","Resource not found");
  return result.data;
};
function csrf(req:Request,config:AppConfig,p:AuthPrincipal,secret:string){
  const origin=req.get("origin");
  if(origin&&!config.corsOrigins.includes(origin))
    throw new HttpError(403,"ORIGIN_FORBIDDEN","Origin denied");
  if(req.get("sec-fetch-site")==="cross-site")
    throw new HttpError(403,"CROSS_SITE_FORBIDDEN","Cross-site request blocked");
  if(config.nodeEnv==="production"&&!origin&&
      !["same-site","same-origin"].includes(req.get("sec-fetch-site")||""))
    throw new HttpError(403,"ORIGIN_REQUIRED","Verified origin required");
  if(!constantTimeHexMatch(req.get("x-csrf-token")||"",
       mac({secret} as AuthDependencies["settings"],"csrf",p.tokenHash)))
    throw new HttpError(403,"CSRF_FAILED","CSRF invalid");
  if(!req.is("application/json"))throw new HttpError(415,"UNSUPPORTED_MEDIA_TYPE","JSON required");
}
function life(current:string,next:string){
  if(next===current)return;
  if(current==="ARCHIVED"||next==="DRAFT")
    throw new HttpError(409,"STATE_TRANSITION_DENIED","Invalid catalog transition");
}
const state=(s:string)=>s.toLowerCase() as "draft"|"published"|"archived";
const cityView=(x:{id:string;slug:string;name:string;countryCode:string;timeZone:string;state:string})=>
  ({id:x.id,slug:x.slug,name:x.name,countryCode:x.countryCode.trim(),timeZone:x.timeZone,state:state(x.state)});
const zoneView=(x:{id:string;cityId:string;slug:string;name:string;centerLat:number;centerLng:number;radiusMeters:number;state:string})=>
  ({id:x.id,cityId:x.cityId,slug:x.slug,name:x.name,centerLat:x.centerLat,
    centerLng:x.centerLng,radiusMeters:x.radiusMeters,state:state(x.state)});
const locView=(x:{id:string;zoneId:string;slug:string;name:string;latitude:number;longitude:number;state:string})=>
  ({id:x.id,zoneId:x.zoneId,slug:x.slug,name:x.name,lat:x.latitude,lng:x.longitude,state:state(x.state)});
async function log(tx:Prisma.TransactionClient,p:AuthPrincipal,action:string,type:string,id:string){
  await tx.auditEvent.create({data:{actorUserId:p.userId,action,
    resourceType:type,resourceId:id}});
}
function conflicts(error:unknown):never{
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")
    throw new HttpError(409,"CATALOG_DUPLICATE","Duplicate slug in scope");
  throw error;
}
export function createGeoRouter(config:AppConfig,{db,settings}:AuthDependencies):Router{
  const router=Router();
  const admin=async(req:Request)=>{
    const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");return p;
  };
  const user=async(req:Request)=>{
    const p=await resolvePrincipal(req,db,settings);
    requireRole(p,"ADMIN","ADVERTISER","DRIVER");return p;
  };
  router.get("/public/locations",route(async(req,res)=>{
    res.json(await listGeo(db,req,false));
  }));
  const formats=[
    ["bike_rear","Bike rear"],["auto_rear","Auto rear"],["auto_side","Auto side"],
    ["car_rear","Car rear"],["car_interior","Car interior"],["helmet","Helmet"],
  ];
  router.get("/public/formats",route(async(req,res)=>{
    if(Object.keys(req.query).some(k=>!["limit","cursor"].includes(k)))
      throw new HttpError(422,"VALIDATION_ERROR","Unsupported format filter");
    const limitRaw=req.query.limit;
    if(limitRaw!==undefined&&(typeof limitRaw!=="string"||!/^(?:[1-9]|[1-9][0-9]|100)$/.test(limitRaw)))
      throw new HttpError(422,"VALIDATION_ERROR","Invalid limit");
    const limit=limitRaw===undefined?20:Number(limitRaw);
    let start=0;
    if(req.query.cursor!==undefined){
      if(typeof req.query.cursor!=="string"||!/^[A-Za-z0-9_-]{8,30}$/.test(req.query.cursor))
        throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
      try{start=Number(Buffer.from(req.query.cursor,"base64url").toString("utf8"));}
      catch{throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");}
      if(!Number.isInteger(start)||start<1||start>=formats.length||
         Buffer.from(String(start)).toString("base64url")!==req.query.cursor)
        throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
    }
    const records=formats.slice(start,start+limit);
    const next=start+limit<formats.length?Buffer.from(String(start+limit)).toString("base64url"):null;
    res.json({data:records.map(([placement,label])=>({placement,label,
      description:"Supported provisional hardware format; not bookable inventory or a live price."})),
      meta:{limit,nextCursor:next}});
  }));
  router.get("/locations",route(async(req,res)=>{
    const p=await user(req);res.json(await listGeo(db,req,p.role==="ADMIN"));
  }));
  router.get("/admin/locations",route(async(req,res)=>{
    await admin(req);res.json(await listGeo(db,req,true));
  }));
  router.get("/public/cities",route(async(req,res)=>{
    if(Object.keys(req.query).length)throw new HttpError(422,"VALIDATION_ERROR","Unsupported query");
    const rows=await db.city.findMany({where:{state:"PUBLISHED"},orderBy:{slug:"asc"},take:100});
    res.json({data:rows.map(cityView)});
  }));
  router.get("/public/zones",route(async(req,res)=>{
    if(Object.keys(req.query).length)throw new HttpError(422,"VALIDATION_ERROR","Unsupported query");
    const zones=await db.zone.findMany({where:{state:"PUBLISHED",city:{state:"PUBLISHED"}},
      orderBy:[{name:"asc"},{id:"asc"}],take:100});
    res.json({data:zones.map(zoneView)});
  }));
  router.get("/admin/cities",route(async(req,res)=>{
    await admin(req);
    if(Object.keys(req.query).length)throw new HttpError(422,"VALIDATION_ERROR","Unsupported query");
    const rows=await db.city.findMany({orderBy:{slug:"asc"},take:100});
    res.json({data:rows.map(cityView)});
  }));
  router.get("/admin/zones",route(async(req,res)=>{
    await admin(req);
    if(Object.keys(req.query).length)throw new HttpError(422,"VALIDATION_ERROR","Unsupported query");
    const rows=await db.zone.findMany({orderBy:[{cityId:"asc"},{slug:"asc"}],take:100});
    res.json({data:rows.map(zoneView)});
  }));

  router.post("/admin/cities",validateBody(cityInput),route(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const input=cityInput.parse(req.body);
    if(!validTimeZone(input.timeZone))throw new HttpError(422,"TIME_ZONE_INVALID","IANA time zone required");
    try{
      const made=await executeIdempotent(db,p,req.get("idempotency-key"),
        "/api/v1/admin/cities","POST",input,async tx=>{
          const row=await tx.city.create({data:{...input}});
          await log(tx,p,"geo.city_created","city",row.id);return row.id;
        });
      const row=await db.city.findUniqueOrThrow({where:{id:made.resourceId}});
      res.status(201).json({data:cityView(row)});
    }catch(e){conflicts(e);}
  }));
  router.patch("/admin/cities/:cityId",validateBody(cityUpdate),route(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const id=identifier(req,"cityId"),input=cityUpdate.parse(req.body);
    if(input.timeZone&&!validTimeZone(input.timeZone))
      throw new HttpError(422,"TIME_ZONE_INVALID","IANA time zone required");
    const row=await serializableTransaction(db,async tx=>{
      const current=await tx.city.findUnique({where:{id}});
      if(!current)throw new HttpError(404,"NOT_FOUND","City not found");
      if(input.state)life(current.state,input.state.toUpperCase());
      const value=await tx.city.update({where:{id},data:{
        name:input.name,timeZone:input.timeZone,
        ...(input.state?{state:input.state.toUpperCase() as "DRAFT"|"PUBLISHED"|"ARCHIVED"}:{})}});
      await log(tx,p,"geo.city_updated","city",id);return value;
    });
    res.json({data:cityView(row)});
  }));
  router.post("/admin/zones",validateBody(zoneInput),route(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const input=zoneInput.parse(req.body);
    try{
      const record=await executeIdempotent(db,p,req.get("idempotency-key"),
        "/api/v1/admin/zones","POST",input,async tx=>{
          const city=await tx.city.findUnique({where:{id:input.cityId}});
          if(!city||city.state==="ARCHIVED")throw new HttpError(404,"NOT_FOUND","City unavailable");
          const row=await tx.zone.create({data:input});
          await log(tx,p,"geo.zone_created","zone",row.id);return row.id;
        });
      const row=await db.zone.findUniqueOrThrow({where:{id:record.resourceId}});
      res.status(201).json({data:zoneView(row)});
    }catch(e){conflicts(e);}
  }));
  router.patch("/admin/zones/:zoneId",validateBody(zoneUpdate),route(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const id=identifier(req,"zoneId"),input=zoneUpdate.parse(req.body);
    const row=await serializableTransaction(db,async tx=>{
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Zone" WHERE "id"=${id}::uuid FOR UPDATE`);
      const zone=await tx.zone.findUnique({where:{id},include:{city:true}});
      if(!zone)throw new HttpError(404,"NOT_FOUND","Zone not found");
      if(input.state){
        life(zone.state,input.state.toUpperCase());
        if(input.state==="published"&&zone.city.state!=="PUBLISHED")
          throw new HttpError(409,"CITY_NOT_PUBLISHED","Publish city first");
      }
      if(input.centerLat!==undefined||input.centerLng!==undefined||input.radiusMeters!==undefined){
        const count=await tx.location.count({where:{zoneId:id}});
        if(count)throw new HttpError(409,"ZONE_LOCKED","Zone geometry locked after a location is added");
      }
      const next=await tx.zone.update({where:{id},data:{
        name:input.name,centerLat:input.centerLat,centerLng:input.centerLng,
        radiusMeters:input.radiusMeters,
        ...(input.state?{state:input.state.toUpperCase() as "DRAFT"|"PUBLISHED"|"ARCHIVED"}:{})}});
      await log(tx,p,"geo.zone_updated","zone",id);return next;
    });
    res.json({data:zoneView(row)});
  }));
  router.post("/admin/locations",validateBody(locationInput),route(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const input=locationInput.parse(req.body);
    try{
      const made=await executeIdempotent(db,p,req.get("idempotency-key"),
        "/api/v1/admin/locations","POST",input,async tx=>{
          // Serialize geometry changes and inserts for this circular zone.
          await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Zone" WHERE "id"=${input.zoneId}::uuid FOR UPDATE`);
          const zone=await tx.zone.findUnique({where:{id:input.zoneId}});
          if(!zone||zone.state==="ARCHIVED")throw new HttpError(404,"NOT_FOUND","Zone unavailable");
          if(metersBetween(input.lat,input.lng,zone.centerLat,zone.centerLng)>zone.radiusMeters)
            throw new HttpError(422,"OUTSIDE_ZONE","Location outside configured zone radius");
          const location=await tx.location.create({data:{zoneId:input.zoneId,slug:input.slug,
            name:input.name,latitude:input.lat,longitude:input.lng}});
          await log(tx,p,"geo.location_created","location",location.id);
          return location.id;
        });
      const row=await db.location.findUniqueOrThrow({where:{id:made.resourceId}});
      res.status(201).json({data:locView(row)});
    }catch(e){conflicts(e);}
  }));
  router.patch("/admin/locations/:locationId",validateBody(locationUpdate),route(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const id=identifier(req,"locationId"),input=locationUpdate.parse(req.body);
    const row=await serializableTransaction(db,async tx=>{
      const current=await tx.location.findUnique({where:{id}});
      if(!current)throw new HttpError(404,"NOT_FOUND","Location not found");
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Zone" WHERE "id"=${current.zoneId}::uuid FOR UPDATE`);
      const zone=await tx.zone.findUniqueOrThrow({where:{id:current.zoneId},include:{city:true}});
      if(input.state){
        life(current.state,input.state.toUpperCase());
        if(input.state==="published"&&(zone.state!=="PUBLISHED"||zone.city.state!=="PUBLISHED"))
          throw new HttpError(409,"PARENT_NOT_PUBLISHED","Publish city and zone first");
      }
      const lat=input.lat??current.latitude,lng=input.lng??current.longitude;
      if(metersBetween(lat,lng,zone.centerLat,zone.centerLng)>zone.radiusMeters)
        throw new HttpError(422,"OUTSIDE_ZONE","Location outside configured zone");
      if(input.lat!==undefined||input.lng!==undefined){
        const assigned=await tx.screen.count({where:{locationId:id}});
        if(assigned)throw new HttpError(409,"LOCATION_LOCKED","Remove screen assignments before editing site coordinates");
      }
      const next=await tx.location.update({where:{id},data:{
        name:input.name,latitude:input.lat,longitude:input.lng,
        ...(input.state?{state:input.state.toUpperCase() as "DRAFT"|"PUBLISHED"|"ARCHIVED"}:{})}});
      await log(tx,p,"geo.location_updated","location",id);return next;
    });
    res.json({data:locView(row)});
  }));
  router.put("/admin/screens/:screenId/location",validateBody(screenLocationInput),route(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const screenId=identifier(req,"screenId"),{locationId}=screenLocationInput.parse(req.body);
    const updated=await serializableTransaction(db,async tx=>{
      const screen=await tx.screen.findUnique({where:{id:screenId},include:{vehicle:true}});
      if(!screen)throw new HttpError(404,"NOT_FOUND","Screen not found");
      if(screen.state!=="PAIRED")throw new HttpError(409,"SCREEN_NOT_PAIRED","Pair device before site assignment");
      const approved=await tx.driverApplication.count({where:{
        driverUserId:screen.vehicle.driverUserId,vehicleId:screen.vehicleId,state:"APPROVED"}});
      if(!approved)throw new HttpError(409,"DRIVER_NOT_APPROVED","Approved driver required");
      if(locationId){
        const location=await tx.location.findUnique({where:{id:locationId},
          include:{zone:{include:{city:true}}}});
        if(!location||location.state!=="PUBLISHED"||location.zone.state!=="PUBLISHED"||
           location.zone.city.state!=="PUBLISHED")
          throw new HttpError(404,"NOT_FOUND","Published site not found");
      }
      const value=await tx.screen.update({where:{id:screenId},data:{locationId}});
      await log(tx,p,"geo.screen_location_assigned","screen",screenId);
      return value;
    });
    res.json({data:{screenId:updated.id,locationId:updated.locationId,
      inventoryStatus:"NOT_BOOKABLE",message:"Site assignment is not installation certification or advertising availability"}});
  }));
  router.get("/admin/locations/:locationId/screens",route(async(req,res)=>{
    await admin(req);const locationId=identifier(req,"locationId");
    const location=await db.location.findUnique({where:{id:locationId}});
    if(!location)throw new HttpError(404,"NOT_FOUND","Location not found");
    const rows=await db.screen.findMany({where:{locationId},take:100,orderBy:{id:"asc"}});
    res.json({data:rows.map(x=>({screenId:x.id,placement:x.placement.toLowerCase(),
      pairingState:x.state.toLowerCase(),bookable:false}))});
  }));
  return router;
}
