// NEYU — seed the database after migrations (safe to run again).
//
//   npm run db:seed
//
// • Makes sure the NEYU organization exists (also created by the migration).
// • Creates the first SUPER ADMIN staff account and gives it the super_admin role.
//     SEED_ADMIN_EMAIL     default: admin@neyuhealth.com
//     SEED_ADMIN_NAME      default: NEYU Super Admin
//     SEED_ADMIN_PASSWORD  if empty, a strong password is generated and printed ONCE.
//   Running again never changes an existing admin's password.
// • Gives every existing patient default email preferences (reminders on, news off).
//
// Test patients for the admin console: npm run db:demo   (remove: npm run db:demo:remove)

import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "crypto";

// Read .env.local / .env (same files the app uses) before Prisma connects.
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
import { promisify } from "util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCb);
const N = 1 << 15, R = 8, P = 1;
async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize("NFKC"), salt, 64, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}
function strongPassword() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let s = ""; for (const b of bytes) s += abc[b % abc.length];
  return `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}

async function main() {
  // 1 · Organization (normally already created by the core_reference_data migration)
  const org = await prisma.organization.upsert({
    where: { id: "org_neyu" },
    update: {},
    create: { id: "org_neyu", slug: "neyu", name: "NEYU Health", kind: "platform", settings: { reportApproval: "optional", reminderDays: 3, undoMinutes: 10 } },
  });
  const role = await prisma.role.findFirst({ where: { key: "super_admin", orgId: null } });
  if (!role) throw new Error("Built-in roles are missing — run `npx prisma migrate deploy` (or `migrate dev`) first.");

  // 2 · First super admin
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@neyuhealth.com").trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME || "NEYU Super Admin";
  let admin = await prisma.staffUser.findUnique({ where: { email } });
  let printed = null;
  if (!admin) {
    const pw = process.env.SEED_ADMIN_PASSWORD || strongPassword();
    if (pw.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
    admin = await prisma.staffUser.create({ data: { email, name, passwordHash: await hashPassword(pw), status: "active" } });
    if (!process.env.SEED_ADMIN_PASSWORD) printed = pw;
  }
  await prisma.membership.upsert({
    where: { staffId_orgId_roleId: { staffId: admin.id, orgId: org.id, roleId: role.id } },
    update: { status: "active" },
    create: { staffId: admin.id, orgId: org.id, roleId: role.id },
  });

  // 3 · Email preferences for patients that don't have them yet
  const missing = await prisma.patient.findMany({ where: { emailPreference: null }, select: { id: true } });
  if (missing.length) await prisma.emailPreference.createMany({ data: missing.map((p) => ({ patientId: p.id })), skipDuplicates: true });

  // Summary
  const [tables] = await prisma.$queryRawUnsafe(`select count(*)::int as n from information_schema.tables where table_schema = current_schema() and table_type = 'BASE TABLE'`);
  const counts = {
    organizations: await prisma.organization.count(), clinics: await prisma.clinic.count(), roles: await prisma.role.count(),
    permissions: await prisma.permission.count(), staff: await prisma.staffUser.count(), patients: await prisma.patient.count(),
  };
  console.log("\n✓ Seed complete");
  console.log(`  tables: ${tables.n} · ` + Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(" · "));
  console.log(`  super admin: ${email}`);
  if (printed) {
    console.log("\n  Super admin password (shown once — save it in your password manager now):");
    console.log(`     ${printed}\n`);
  }
}

main()
  .catch((e) => { console.error("\n✗ Seed failed:", e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
