// File storage (Phase 3 · part 5): patient documents and data exports live in
// files, not inside the database — the database stays small and fast at scale.
//
//   STORAGE_DRIVER=local        (default) files under STORAGE_DIR
//   STORAGE_DIR=./storage       (default) — on the server: a mounted, backed-up disk
//
// Every file is encrypted at rest (AES-256-GCM, key from TOKEN_ENC_KEY), so a copied
// disk or backup is unreadable without the key. Moving to S3-compatible storage later
// only means adding one more driver below — no other code changes.

import { promises as fs } from "fs";
import path from "path";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const MAGIC = Buffer.from("NEYU1");

function encKey(): Buffer | null {
  const k = process.env.TOKEN_ENC_KEY || process.env.ADMIN_SESSION_SECRET;
  return k ? createHash("sha256").update("storage:" + k).digest() : null;
}
function seal(buf: Buffer): Buffer {
  const key = encKey();
  if (!key) return buf; // no key on this machine (dev without .env) → plain file
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}
function open(buf: Buffer): Buffer {
  if (buf.length < 33 || !buf.subarray(0, 5).equals(MAGIC)) return buf;
  const key = encKey();
  if (!key) throw new Error("This file is encrypted — TOKEN_ENC_KEY is missing.");
  const d = createDecipheriv("aes-256-gcm", key, buf.subarray(5, 17));
  d.setAuthTag(buf.subarray(17, 33));
  return Buffer.concat([d.update(buf.subarray(33)), d.final()]);
}

export const sha256Hex = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

function safeKey(key: string) {
  if (!/^[A-Za-z0-9/_.-]{3,200}$/.test(key) || key.includes("..") || key.startsWith("/")) throw new Error("bad storage key");
  return key;
}

interface Driver {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  del(key: string): Promise<void>;
  delPrefix(prefix: string): Promise<number>;
}

const local = (): Driver => {
  const root = path.resolve(process.env.STORAGE_DIR || "storage");
  const full = (k: string) => path.join(root, safeKey(k));
  return {
    async put(k, data) {
      const f = full(k);
      await fs.mkdir(path.dirname(f), { recursive: true });
      const tmp = f + ".tmp-" + randomBytes(4).toString("hex");
      await fs.writeFile(tmp, data, { mode: 0o600 });
      await fs.rename(tmp, f); // atomic: a reader never sees half a file
    },
    async get(k) {
      try { return await fs.readFile(full(k)); } catch (e: any) { if (e.code === "ENOENT") return null; throw e; }
    },
    async del(k) { await fs.rm(full(k), { force: true }); },
    async delPrefix(prefix) {
      const dir = full(prefix.replace(/\/$/, ""));
      let n = 0;
      try { const walk = async (d: string) => { for (const e of await fs.readdir(d, { withFileTypes: true })) { if (e.isDirectory()) await walk(path.join(d, e.name)); else n++; } }; await walk(dir); } catch { return 0; }
      await fs.rm(dir, { recursive: true, force: true });
      return n;
    },
  };
};

let driver: Driver | null = null;
function store(): Driver {
  if (driver) return driver;
  const kind = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  if (kind !== "local") throw new Error(`STORAGE_DRIVER=${kind} is not set up yet — use "local".`);
  return (driver = local());
}

export const storage = {
  driver: () => (process.env.STORAGE_DRIVER || "local").toLowerCase(),
  put: (key: string, data: Buffer) => store().put(key, seal(data)),
  get: async (key: string) => { const b = await store().get(key); return b ? open(b) : null; },
  del: (key: string) => store().del(key),
  delPrefix: (prefix: string) => store().delPrefix(prefix),
};

/** Storage key for a patient's document. */
export const docKey = (patientId: string, docId: string) => `patients/${safeKey(patientId)}/docs/${safeKey(docId)}`;
export const exportKey = (patientId: string, exportId: string) => `patients/${safeKey(patientId)}/exports/${safeKey(exportId)}.json`;
export const patientPrefix = (patientId: string) => `patients/${safeKey(patientId)}/`;

/** The bytes of a HealthDocument, wherever they live (file storage, or old rows still in the database). */
export async function docBytes(d: { storageKey?: string | null; data?: Uint8Array | Buffer | null }): Promise<Buffer> {
  if (d.storageKey) {
    const b = await storage.get(d.storageKey);
    if (!b) throw new Error("File missing from storage: " + d.storageKey);
    return b;
  }
  if (d.data) return Buffer.from(d.data);
  throw new Error("Document has no file.");
}
