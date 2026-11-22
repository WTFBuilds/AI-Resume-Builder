import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Storage abstraction: local filesystem in dev, S3 in production.
 * Keys are POSIX-style: "exports/<exportId>.pdf".
 * Relative local roots are anchored to the monorepo root so the web app
 * and the worker (different cwd) always agree on where files live.
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

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER ?? "local";
  driver =
    kind === "s3" && process.env.S3_EXPORTS_BUCKET
      ? new S3Driver(process.env.S3_EXPORTS_BUCKET, process.env.S3_REGION)
      : new LocalDriver(process.env.LOCAL_EXPORTS_DIR ?? "./.data/exports");
  return driver;
}

export function storageKind(): "local" | "s3" {
  return getStorage() instanceof S3Driver ? "s3" : "local";
}

/** Read-through helper used by the web download route for local dev. */
export async function readStorage(key: string): Promise<Buffer | null> {
  try {
    return await getStorage().get(key);
  } catch {
    return null;
  }
}
