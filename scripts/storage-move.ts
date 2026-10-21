// Moves report files that are still inside the database into file storage (one-time, safe to re-run).
//   npm run storage:move              move everything
//   npm run storage:move -- --dry-run count only
import fs from "node:fs";
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

async function main() {
  const { prisma } = await import("../backend/db");
  const { storage, docKey, sha256Hex } = await import("../backend/storage");
  const dry = process.argv.includes("--dry-run");
  const todo = await prisma.healthDocument.count({ where: { storageKey: null, data: { not: null } } });
  console.log(`\n${todo} report file(s) still in the database${dry ? " (dry run)" : ""}`);
  let moved = 0, bytes = 0;
  while (!dry) {
    const batch = await prisma.healthDocument.findMany({ where: { storageKey: null, data: { not: null } }, select: { id: true, patientId: true, data: true }, take: 20 });
    if (!batch.length) break;
    for (const d of batch) {
      const buf = Buffer.from(d.data!);
      const key = docKey(d.patientId, d.id);
      await storage.put(key, buf);
      const back = await storage.get(key); // verify before removing from the database
      if (!back || !back.equals(buf)) throw new Error(`verify failed for ${d.id}`);
      await prisma.healthDocument.update({ where: { id: d.id }, data: { storageKey: key, sha256: sha256Hex(buf), data: null } });
      moved++; bytes += buf.length;
    }
  }
  console.log(dry ? "Nothing changed.\n" : `✓ Moved ${moved} file(s), ${(bytes / 1024 / 1024).toFixed(1)} MB, to ${storage.driver()} storage (encrypted).\n`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
