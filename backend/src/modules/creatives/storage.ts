import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "../../lib/http-error.js";
export interface MediaObject { sizeBytes:number; contentType:string; versionId:string }
export interface PrivateCreativeStorage {
  signedPut(key:string,mime:string,size:number,seconds:number):Promise<{url:string;headers:Record<string,string>}>;
  head(key:string):Promise<MediaObject>;
  readVersion(key:string,version:string,maxBytes:number):Promise<Buffer>;
  writeProcessed(key:string,mime:string,bytes:Buffer):Promise<MediaObject>;
  signedGet(key:string,version:string):Promise<string>;
}
export function createCreativeStorage(env:NodeJS.ProcessEnv=process.env):PrivateCreativeStorage {
  const bucket=env.CREATIVE_S3_BUCKET,region=env.CREATIVE_S3_REGION;
  let client:S3Client|undefined;
  function connect(){
    if(!bucket||!/^[a-z0-9.-]{3,63}$/.test(bucket)||!region)
      throw new HttpError(503,"PRIVATE_MEDIA_UNAVAILABLE","Private creative storage unconfigured");
    client??=new S3Client({region});return {client,bucket};
  }
  return {
    async signedPut(key,mime,size,seconds){
      const {client,bucket}=connect();
      const url=await getSignedUrl(client,new PutObjectCommand({
        Bucket:bucket,Key:key,ContentType:mime,ContentLength:size,
        ServerSideEncryption:"AES256",
      }),{expiresIn:Math.max(1,Math.min(300,Math.floor(seconds)))});
      return {url,headers:{"content-type":mime,"x-amz-server-side-encryption":"AES256"}};
    },
    async head(key){
      const {client,bucket}=connect();
      const item=await client.send(new HeadObjectCommand({Bucket:bucket,Key:key}));
      if(!item.VersionId||item.VersionId==="null"||!item.ContentLength||!item.ContentType)
        throw new HttpError(503,"STORAGE_VERSION_REQUIRED","Versioned storage required");
      return {sizeBytes:item.ContentLength,contentType:item.ContentType,versionId:item.VersionId};
    },
    async readVersion(key,version,maxBytes){
      const {client,bucket}=connect();
      const item=await client.send(new GetObjectCommand({Bucket:bucket,Key:key,VersionId:version}));
      if(!item.Body||item.VersionId!==version||!item.ContentLength||item.ContentLength>maxBytes)
        throw new HttpError(422,"MEDIA_SOURCE_INVALID","Invalid source version or size");
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of item.Body as AsyncIterable<Uint8Array>){
        size+=chunk.byteLength;
        if(size>maxBytes)throw new HttpError(422,"MEDIA_TOO_LARGE","File too large");
        chunks.push(Buffer.from(chunk));
      }
      if(size!==item.ContentLength)throw new HttpError(422,"MEDIA_INCOMPLETE","Upload incomplete");
      return Buffer.concat(chunks);
    },
    async signedGet(key,version){
      const {client,bucket}=connect();
      return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key,VersionId:version}),{expiresIn:60});
    },
    async writeProcessed(key,mime,bytes){
      const {client,bucket}=connect();
      const out=await client.send(new PutObjectCommand({Bucket:bucket,Key:key,
        Body:bytes,ContentType:mime,ContentLength:bytes.length,ServerSideEncryption:"AES256"}));
      if(!out.VersionId||out.VersionId==="null")
        throw new HttpError(503,"STORAGE_VERSION_REQUIRED","Processed output must be versioned");
      return {sizeBytes:bytes.length,contentType:mime,versionId:out.VersionId};
    },
  };
}
