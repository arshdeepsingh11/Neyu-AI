// Collision-safe ids for rows created before the database insert (e.g. a file
// is stored under the id first). Same shape as Prisma cuid: lower-case, sortable by time.
import { randomBytes } from "crypto";

export function createId(prefix = "c"): string {
  return prefix + Date.now().toString(36) + randomBytes(10).toString("base64url").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12).padEnd(12, "0");
}
