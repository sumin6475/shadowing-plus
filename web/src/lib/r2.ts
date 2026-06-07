import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

let cachedClient: S3Client | null = null;
function client(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function bucket(): string {
  return requireEnv("R2_BUCKET_NAME");
}

export async function putBuffer(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function putJson(key: string, value: unknown): Promise<void> {
  await putBuffer(
    key,
    Buffer.from(JSON.stringify(value), "utf-8"),
    "application/json",
  );
}

export async function getJson<T>(key: string): Promise<T> {
  const resp = await client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  if (!resp.Body) throw new Error(`Empty body for ${key}`);
  const text = await resp.Body.transformToString("utf-8");
  return JSON.parse(text) as T;
}

export async function exists(key: string): Promise<boolean> {
  try {
    await client().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteKey(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSec = 3600,
): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: expiresInSec },
  );
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSec = 3600,
): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSec },
  );
}

export function publicUrl(key: string): string {
  const base = requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * Inverse of publicUrl(): recover the R2 object key from a stored public URL.
 * Returns null when the URL doesn't sit under R2_PUBLIC_URL (e.g. a legacy
 * Storage URL), so callers can skip it rather than mis-key a HEAD.
 */
export function keyFromPublicUrl(url: string): string | null {
  const base = requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
  const prefix = `${base}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/**
 * HEAD an object and return its size in bytes. Returns 0 when the object is
 * missing or the request fails, so a single bad key never sinks an aggregate.
 */
export async function headSize(key: string): Promise<number> {
  try {
    const resp = await client().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return resp.ContentLength ?? 0;
  } catch {
    return 0;
  }
}

export function jobKey(jobId: string, suffix: string): string {
  return `jobs/${jobId}/${suffix}`;
}
