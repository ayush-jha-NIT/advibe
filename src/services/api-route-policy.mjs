// Shared by the server proxy and Node contract tests. No Next/React runtime required.
export const DEMO_MODE=process.env.NEXT_PUBLIC_DEMO_MODE!=="false";
const firstSegments=new Set([
 "auth","me","businesses","public","drivers","admin","locations","screens",
 "creatives","pricing","campaigns","reservations","payments","driver","reports",
 "tickets","notifications","support","maintenance",
]);
const forbiddenPaths=[
 /^admin\/devices(?:\/|$)/,
 /^devices(?:\/|$)/,
 /^webhooks(?:\/|$)/,
 /^auth\/mfa\/enroll(?:\/|$)/,
 /^drivers\/screens\/[^/]+\/trips\/start$/,
 /^drivers\/trips\/[^/]+\/stop$/,
 /^drivers\/vehicles\/[^/]+\/gps-consent(?:\/|$)/,
];
export function allowedApiPath(parts,method){
 if(!Array.isArray(parts)||parts.length<1||parts.length>12||
  !["GET","POST","PATCH","PUT","DELETE"].includes(method))return false;
 if(parts.some(p=>typeof p!=="string"||p.length>180||
   !/^[A-Za-z0-9_-]+$/.test(p)))return false;
 if(!firstSegments.has(parts[0]))return false;
 const joined=parts.join("/");
 return !forbiddenPaths.some(pattern=>pattern.test(joined));
}
export function backendOrigin(raw,production=false){
 if(typeof raw!=="string"||!raw.trim())return null;
 try {
  const u=new URL(raw);
  if(u.username||u.password||u.search||u.hash||u.pathname!=="/"||
   u.origin!==raw||!(u.protocol==="https:"||
    (!production&&u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname))))
   return null;
  return u.origin;
 }catch{return null;}
}
