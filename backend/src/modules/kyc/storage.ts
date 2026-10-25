import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "../../lib/http-error.js";

export interface KycObjectInfo { sizeBytes: number; contentType: string; versionId: string; }
export interface PrivateKycStorage {
  presignPut(key: string, contentType: string, sizeBytes: number): Promise<{
    url: string; headers: Record<string, string>;
  }>;
  head(key: string): Promise<KycObjectInfo>;
  presignGet(key: string, versionId: string): Promise<string>;
}

/** Private, versioned S3 bucket, NEVER a public Cloudinary URL. */
export function createPrivateKycStorage(env: NodeJS.ProcessEnv = process.env): PrivateKycStorage {
  const bucket = env.KYC_S3_BUCKET;
  const region = env.KYC_S3_REGION;
  const client = region ? new S3Client({ region }) : null;
  function configured() {
    if (!bucket || !client || !/^[a-z0-9.-]{3,63}$/.test(bucket)) {
      throw new HttpError(503, "PRIVATE_STORAGE_UNAVAILABLE", "Private document storage is unavailable");
    }
    return { bucket, client };
  }
  return {
    async presignPut(key, contentType, sizeBytes) {
      const { bucket, client } = configured();
      const signed = await getSignedUrl(client, new PutObjectCommand({
        Bucket: bucket, Key: key, ContentType: contentType, ContentLength: sizeBytes,
        ServerSideEncryption: "AES256",
      }), { expiresIn: 300 });
      return { url: signed, headers: {
        "content-type": contentType,
        "x-amz-server-side-encryption": "AES256",
      } };
    },
    async head(key) {
      const { bucket, client } = configured();
      try {
        const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        if (!response.VersionId || !response.ContentType || !response.ContentLength) {
          throw new HttpError(503, "STORAGE_VERSION_REQUIRED", "Private storage versioning is required");
        }
        return { sizeBytes: response.ContentLength, contentType: response.ContentType,
          versionId: response.VersionId };
      } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(503, "PRIVATE_STORAGE_UNAVAILABLE", "Private document verification unavailable");
      }
    },
    async presignGet(key, versionId) {
      const { bucket, client } = configured();
      return getSignedUrl(client, new GetObjectCommand({
        Bucket: bucket, Key: key, VersionId: versionId,
        ResponseContentDisposition: "attachment",
        ResponseCacheControl: "no-store",
      }), { expiresIn: 60 });
    },
  };
}
