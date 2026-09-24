import "server-only";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Env } from "@/lib/env";
import { MEDIA_URL_TTL_SECONDS } from "./media-policy";

let client: S3Client | undefined;
function storage() {
  const config = getR2Env();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return { client, bucket: config.bucket };
}

export async function signedUploadUrl(
  key: string,
  mimeType: string,
  byteSize: number,
) {
  const { client, bucket } = storage();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: byteSize,
    }),
    {
      expiresIn: MEDIA_URL_TTL_SECONDS.upload,
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
}

export async function signedViewUrl(key: string) {
  const { client, bucket } = storage();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: MEDIA_URL_TTL_SECONDS.view },
  );
}

export async function headMedia(key: string) {
  const { client, bucket } = storage();
  return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

export async function mediaSignature(key: string) {
  const { client, bucket } = storage();
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-31" }),
  );
  return Buffer.from(await result.Body!.transformToByteArray());
}

export async function deleteMediaObject(key: string) {
  const { client, bucket } = storage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
