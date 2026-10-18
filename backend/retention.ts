// Deletes rows older than N days in small batches (Phase 5). One big DELETE on a table with
// millions of rows holds locks and bloats the write-ahead log; batches of 10,000 don't.
import { prisma } from "@backend/db";

const TABLES = new Set(["PageVisit", "SiteEvent", "OutboundClick"]);

export async function trimOld(table: string, column: string, days: number, batch = 10_000, maxBatches = 500) {
  if (!TABLES.has(table) || !/^[a-zA-Z]+$/.test(column)) throw new Error("trimOld: table not allowed");
  const before = new Date(Date.now() - days * 86400_000);
  let total = 0;
  for (let i = 0; i < maxBatches; i++) {
    const n = await prisma.$executeRawUnsafe(
      `delete from "${table}" where id in (select id from "${table}" where "${column}" < $1 limit ${batch})`, before);
    total += n;
    if (n < batch) break;
  }
  return total;
}
