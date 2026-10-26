import { z } from "zod";
export const uuid=z.uuid();
export const slug=z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const latitude=z.number().finite().min(-90).max(90);
export const longitude=z.number().finite().min(-180).max(180);
export const catalogState=z.enum(["draft","published","archived"]);
export const cityInput=z.strictObject({
  slug,name:z.string().trim().min(1).max(120),countryCode:z.string().regex(/^[A-Z]{2}$/),
  timeZone:z.string().min(3).max(100)
});
export const cityUpdate=z.strictObject({
  name:z.string().trim().min(1).max(120).optional(),timeZone:z.string().min(3).max(100).optional(),
  state:catalogState.optional()
}).refine(v=>Object.keys(v).length>0);
export const zoneInput=z.strictObject({
  cityId:uuid,slug,name:z.string().trim().min(1).max(120),
  centerLat:latitude,centerLng:longitude,radiusMeters:z.int().min(100).max(50000)
});
export const zoneUpdate=z.strictObject({
  name:z.string().trim().min(1).max(120).optional(),centerLat:latitude.optional(),
  centerLng:longitude.optional(),radiusMeters:z.int().min(100).max(50000).optional(),
  state:catalogState.optional()
}).refine(v=>Object.keys(v).length>0);
export const locationInput=z.strictObject({
  zoneId:uuid,slug,name:z.string().trim().min(1).max(160),lat:latitude,lng:longitude
});
export const locationUpdate=z.strictObject({
  name:z.string().trim().min(1).max(160).optional(),lat:latitude.optional(),
  lng:longitude.optional(),state:catalogState.optional()
}).refine(v=>Object.keys(v).length>0);
export const screenLocationInput=z.strictObject({locationId:uuid.nullable()});
export function validTimeZone(value:string):boolean{
  try{return new Intl.DateTimeFormat("en-US",{timeZone:value}).resolvedOptions().timeZone.length>0;}
  catch{return false;}
}
export function metersBetween(latA:number,lngA:number,latB:number,lngB:number):number{
  const rad=Math.PI/180;const a1=latA*rad,a2=latB*rad;
  let dl=(lngB-lngA)*rad;
  if(dl>Math.PI)dl-=2*Math.PI;if(dl< -Math.PI)dl+=2*Math.PI;
  const h=Math.sin((latB-latA)*rad/2)**2+
    Math.cos(a1)*Math.cos(a2)*Math.sin(dl/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
