import { HttpError } from "../../lib/http-error.js";
export function distanceMeters(lat1:number,lng1:number,lat2:number,lng2:number):number{
 const rad=Math.PI/180;
 const a1=lat1*rad,a2=lat2*rad,dlat=(lat2-lat1)*rad,dlng=(lng2-lng1)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a1)*Math.cos(a2)*Math.sin(dlng/2)**2;
 return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function assertPlausibleFix(prev:{
 latitude:number;longitude:number;observedAt:Date
}|null,current:{lat:number;lng:number;observedAt:Date;accuracyMeters:number}){
 if(!Number.isFinite(current.lat)||!Number.isFinite(current.lng)||
  current.accuracyMeters>50||current.accuracyMeters<0)
  throw new HttpError(422,"GPS_ACCURACY_REJECTED","Location accuracy is insufficient");
 if(prev){
  const dt=(current.observedAt.getTime()-prev.observedAt.getTime())/1000;
  if(dt<=0)throw new HttpError(422,"GPS_ORDER_INVALID","GPS timestamps must strictly increase");
  const meters=distanceMeters(prev.latitude,prev.longitude,current.lat,current.lng);
  // A generous 45 m/s cap rejects impossible jumps without treating proximity as proof of viewership.
  if(meters/dt>45)throw new HttpError(422,"GPS_SPEED_IMPLAUSIBLE","GPS jump implausible");
 }
}
export function assertTime(now:Date,observed:Date){
 if(!Number.isFinite(observed.getTime())||Math.abs(now.getTime()-observed.getTime())>120000)
  throw new HttpError(422,"TELEMETRY_TIME_INVALID","Telemetry timestamp outside bounded clock skew");
}
