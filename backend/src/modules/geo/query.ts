import { Prisma, type PrismaClient } from "@prisma/client";
import type { Request } from "express";
import { z } from "zod";
import { HttpError } from "../../lib/http-error.js";
import { latitude, longitude, slug, uuid } from "./schemas.js";

interface GeoQuery { limit:number;cursor?:string;citySlug?:string;zoneId?:string;
  bbox?:[number,number,number,number];around?:{lat:number;lng:number;radiusMeters:number}; }
function filter(req:Request):GeoQuery {
  const allowed=new Set(["limit","cursor","citySlug","zoneId","minLat","minLng","maxLat","maxLng","lat","lng","radiusMeters"]);
  for(const key of Object.keys(req.query))
    if(!allowed.has(key))throw new HttpError(422,"VALIDATION_ERROR","Unknown location filter");
  function one(key:string):string|undefined {
    const v=req.query[key];
    if(v===undefined)return undefined;
    if(typeof v!=="string")throw new HttpError(422,"VALIDATION_ERROR","Invalid location filter");
    return v;
  }
  const lim=one("limit");
  if(lim&&!/^(?:[1-9]|[1-9][0-9]|100)$/.test(lim))
    throw new HttpError(422,"VALIDATION_ERROR","limit must be between 1 and 100");
  const limit=lim?Number(lim):20;
  const encoded=one("cursor");
  let cursor:string|undefined;
  if(encoded){
    if(!/^[A-Za-z0-9_-]{20,70}$/.test(encoded))throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
    try{cursor=Buffer.from(encoded,"base64url").toString("utf8");}
    catch{throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");}
    if(!uuid.safeParse(cursor).success||Buffer.from(cursor).toString("base64url")!==encoded)
      throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
  }
  const citySlug=one("citySlug"),zoneId=one("zoneId");
  if(citySlug&&!slug.safeParse(citySlug).success)throw new HttpError(422,"VALIDATION_ERROR","Invalid city");
  if(zoneId&&!uuid.safeParse(zoneId).success)throw new HttpError(422,"VALIDATION_ERROR","Invalid zone");
  const rawBbox=["minLat","minLng","maxLat","maxLng"].map(one);
  let bbox:GeoQuery["bbox"];
  if(rawBbox.some(v=>v!==undefined)){
    if(rawBbox.some(v=>v===undefined))throw new HttpError(422,"VALIDATION_ERROR","Complete bounding box required");
    const [minLat,minLng,maxLat,maxLng]=rawBbox.map(Number) as [number,number,number,number];
    if(!latitude.safeParse(minLat).success||!latitude.safeParse(maxLat).success||
       !longitude.safeParse(minLng).success||!longitude.safeParse(maxLng).success||
       minLat>maxLat||minLng>maxLng||maxLat-minLat>5||maxLng-minLng>5)
      throw new HttpError(422,"VALIDATION_ERROR","Invalid or oversized bounding box");
    bbox=[minLat,minLng,maxLat,maxLng];
  }
  const aroundRaw=["lat","lng","radiusMeters"].map(one);
  let around:GeoQuery["around"];
  if(aroundRaw.some(v=>v!==undefined)){
    if(aroundRaw.some(v=>v===undefined))throw new HttpError(422,"VALIDATION_ERROR","Complete radius query required");
    const [lat,lng,radiusMeters]=aroundRaw.map(Number) as [number,number,number];
    if(!latitude.safeParse(lat).success||!longitude.safeParse(lng).success||
       !z.number().int().min(100).max(50000).safeParse(radiusMeters).success)
      throw new HttpError(422,"VALIDATION_ERROR","Invalid distance filter");
    around={lat,lng,radiusMeters};
  }
  return {limit,cursor,citySlug,zoneId,bbox,around};
}
interface GeoRow{id:string;slug:string;name:string;latitude:number;longitude:number;
  state:string;zoneId:string;zoneName:string;cityId:string;cityName:string;citySlug:string;}
export async function listGeo(db:PrismaClient,req:Request,admin:boolean){
  const v=filter(req);
  const clauses:Prisma.Sql[]=[];
  if(!admin)clauses.push(Prisma.sql`l."state"='PUBLISHED' AND z."state"='PUBLISHED' AND c."state"='PUBLISHED'`);
  if(v.citySlug)clauses.push(Prisma.sql`c."slug"=${v.citySlug}`);
  if(v.zoneId)clauses.push(Prisma.sql`l."zoneId"=${v.zoneId}::uuid`);
  if(v.cursor)clauses.push(Prisma.sql`l."id" > ${v.cursor}::uuid`);
  if(v.bbox){
    const [minLat,minLng,maxLat,maxLng]=v.bbox;
    clauses.push(Prisma.sql`point(l."longitude",l."latitude") <@
      box(point(${minLng},${minLat}),point(${maxLng},${maxLat}))`);
  }
  if(v.around){
    const {lat,lng,radiusMeters}=v.around;
    const latSpan=radiusMeters/111195;
    const lngSpan=Math.min(180,radiusMeters/(111195*Math.max(0.01,Math.abs(Math.cos(lat*Math.PI/180)))));
    if(lng-lngSpan>=-180&&lng+lngSpan<=180){
      clauses.push(Prisma.sql`point(l."longitude",l."latitude") <@
        box(point(${lng-lngSpan},${Math.max(-90,lat-latSpan)}),
            point(${lng+lngSpan},${Math.min(90,lat+latSpan)}))`);
    }
    clauses.push(Prisma.sql`12742000 * asin(sqrt(least(1::float8,greatest(0::float8,
      pow(sin(radians(l."latitude"-${lat})/2),2)+
      cos(radians(${lat}))*cos(radians(l."latitude"))*
      pow(sin(radians(l."longitude"-${lng})/2),2))))) <= ${radiusMeters}`);
  }
  const where=clauses.length?Prisma.sql`WHERE ${Prisma.join(clauses," AND ")}`:Prisma.empty;
  const rows=await db.$queryRaw<GeoRow[]>(Prisma.sql`
    SELECT l."id",l."slug",l."name",l."latitude",l."longitude",l."state",
      l."zoneId",z."name" AS "zoneName",c."id" AS "cityId",
      c."name" AS "cityName",c."slug" AS "citySlug"
    FROM "Location" l JOIN "Zone" z ON z."id"=l."zoneId"
    JOIN "City" c ON c."id"=z."cityId" ${where}
    ORDER BY l."id" ASC LIMIT ${v.limit+1}`);
  const data=rows.slice(0,v.limit);
  return {data:data.map(x=>({id:x.id,slug:x.slug,name:x.name,city:x.cityName,cityId:x.cityId,
    citySlug:x.citySlug,zone:x.zoneName,zoneId:x.zoneId,lat:x.latitude,lng:x.longitude,
    ...(admin?{state:x.state.toLowerCase()}:{} )})),
    meta:{limit:v.limit,nextCursor:rows.length>v.limit&&data.length?
      Buffer.from(data[data.length-1]!.id).toString("base64url"):null}};
}
