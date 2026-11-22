import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v2 as cloudinary } from "cloudinary";

/**
 * Storage abstraction:
 *   local      — filesystem (dev), anchored to the monorepo root
 *   s3         — S3 + presigned URLs (managed AWS path, docs/DEPLOY.md)
 *   cloudinary — raw + authenticated resources, signed download URLs
 *                (shift plan: PDFs live in Cloudinary, see SHIFTPLAN.md)
 * Keys are POSIX-style: "exports/<exportId>.pdf".
 */
function resolveWorkspaceRoot(start: string): string {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = path.dirname(dir);
  }
  return start;
}

export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Returns a URL the browser can fetch; drivers may return file:// for dev. */
  downloadUrl(key: string): Promise<string>;
}

class LocalDriver implements StorageDriver {
  private readonly baseDir: string;

  constructor(baseDirRaw: string) {
    this.baseDir = path.isAbsolute(baseDirRaw)
      ? baseDirRaw
      : path.join(resolveWorkspaceRoot(process.cwd()), baseDirRaw);
    mkdirSync(this.baseDir, { recursive: true });
  }

  private resolve(key: string): string {
    const full = path.resolve(this.baseDir, key);
    if (!full.startsWith(path.resolve(this.baseDir))) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFileSync(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    try {
      unlinkSync(this.resolve(key));
    } catch {
      /* already gone */
    }
  }

  async downloadUrl(key: string): Promise<string> {
    // Local dev: served through the web app's download route.
    return `/api/exports/local/${encodeURIComponent(key)}`;
  }
}

class S3Driver implements StorageDriver {
  private readonly client: S3Client;

  constructor(private readonly bucket: string, region?: string) {
    this.client = new S3Client(region ? { region } : {});
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        ServerSideEncryption: "aws:kms",
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Empty object: ${key}`);
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async downloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 600 }, // 10 minutes, per plan §14
    );
  }
}

/**
 * Cloudinary raw/authenticated driver — the shift-plan default for exports.
 * Downloads use signed private URLs with a short TTL (same contract as the
 * S3 presigner); nothing is ever publicly listable.
 */
class CloudinaryDriver implements StorageDriver {
  constructor(cfg: { cloudName: string; apiKey: string; apiSecret: string }) {
    cloudinary.config({
      cloud_name: cfg.cloudName,
      api_key: cfg.apiKey,
      api_secret: cfg.apiSecret,
      secure: true,
    });
  }

  private privateUrl(key: string, ttlSeconds: number): string {
    return cloudinary.utils.private_download_url(key, "pdf", {
      resource_type: "raw",
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
      attachment: false,
    });
  }

  async put(key: string, data: Buffer, contentType = "application/pdf"): Promise<void> {
    await cloudinary.uploader.upload(`data:${contentType};base64,${data.toString("base64")}`, {
      resource_type: "raw",
      type: "authenticated",
      public_id: key,
      overwrite: true,
      invalidate: true,
    });
  }

  async get(key: string): Promise<Buffer> {
    const res = await fetch(this.privateUrl(key, 300));
    if (!res.ok) throw new Error(`Cloudinary GET failed (${res.status}) for ${key}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, {
      resource_type: "raw",
      type: "authenticated",
      invalidate: true,
    });
  }

  async downloadUrl(key: string): Promise<string> {
    return this.privateUrl(key, 600); // 10 minutes, per plan §14
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER ?? "local";
  if (kind === "s3" && process.env.S3_EXPORTS_BUCKET) {
    driver = new S3Driver(process.env.S3_EXPORTS_BUCKET, process.env.S3_REGION);
  } else if (
    kind === "cloudinary" &&
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    driver = new CloudinaryDriver({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    });
  } else {
    driver = new LocalDriver(process.env.LOCAL_EXPORTS_DIR ?? "./.data/exports");
  }
  return driver;
}

export function storageKind(): "local" | "s3" | "cloudinary" {
  const d = getStorage();
  if (d instanceof S3Driver) return "s3";
  if (d instanceof CloudinaryDriver) return "cloudinary";
  return "local";
}

/** Read-through helper used by the web download route for local dev. */
export async function readStorage(key: string): Promise<Buffer | null> {
  try {
    return await getStorage().get(key);
  } catch {
    return null;
  }
}
