import { createHash, createPrivateKey, createPublicKey, randomBytes, sign, verify, type KeyObject } from "node:crypto";
import { HttpError } from "../../lib/http-error.js";

export function publicDeviceKey(spki: string): KeyObject {
  if (!/^[A-Za-z0-9_-]{54,180}$/.test(spki)) throw new HttpError(422,"DEVICE_KEY_INVALID","Invalid device key");
  try {
    const key=createPublicKey({key:Buffer.from(spki,"base64url"),format:"der",type:"spki"});
    if(key.asymmetricKeyType!=="ed25519")throw new Error("wrong algorithm");
    if(key.export({type:"spki",format:"der"}).toString("base64url")!==spki) throw new Error("noncanonical key");
    return key;
  } catch {throw new HttpError(422,"DEVICE_KEY_INVALID","Invalid Ed25519 device key");}
}
export function fingerprint(spki:string):string {
  return createHash("sha256").update(Buffer.from(spki,"base64url")).digest("hex");
}
export function pairingMessage(id:string,screenId:string,nonce:string):Buffer {
  return Buffer.from(JSON.stringify(["advibe-pair-v1",id,screenId,nonce]));
}
export function deviceMessage(method:string,path:string,timestamp:string,nonce:string,body:unknown):Buffer {
  const hash=createHash("sha256").update(JSON.stringify(body??{})).digest("hex");
  return Buffer.from(JSON.stringify(["advibe-device-v1",method.toUpperCase(),path,timestamp,nonce,hash]));
}
export function verifyEd25519(key:KeyObject,message:Buffer,sig:string):boolean {
  if(!/^[A-Za-z0-9_-]{86}$/.test(sig))return false;
  try {return verify(null,message,key,Buffer.from(sig,"base64url"));}catch{return false;}
}
export function randomChallenge():string {return randomBytes(32).toString("base64url");}
export function getManifestSigner(env:NodeJS.ProcessEnv=process.env):KeyObject {
  const encoded=env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64;
  if(!encoded||!/^[A-Za-z0-9_-]{50,250}$/.test(encoded)){
    throw new HttpError(503,"MANIFEST_SIGNING_UNAVAILABLE","Device manifest signing is not configured");
  }
  try {
    const key=createPrivateKey({key:Buffer.from(encoded,"base64url"),format:"der",type:"pkcs8"});
    if(key.asymmetricKeyType!=="ed25519")throw new Error("Wrong manifest key algorithm");
    return key;
  } catch {throw new HttpError(503,"MANIFEST_SIGNING_UNAVAILABLE","Device manifest signing is unavailable");}
}
export function signEmptyManifest(key:KeyObject,screenId:string,version:number,expiresAt:Date){
  const unsigned={screenId,version,expiresAt:expiresAt.toISOString(),entries:[] as never[]};
  const signature=sign(null,Buffer.from(JSON.stringify(unsigned)),key).toString("base64url");
  return {...unsigned,signature};
}
