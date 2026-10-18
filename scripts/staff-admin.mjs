// NEYU — staff accounts from the command line (your PC or the server).
//
//   npm run staff -- list
//   npm run staff -- add <username> "<Full name>"          adds a SUPER ADMIN (admins are added in the console)
//   npm run staff -- set-password <username> "<password>"
//   npm run staff -- reset-password <username>             prints a new strong password once, signs them out everywhere
//   npm run staff -- reset-2step <email>                  next sign-in shows a new QR code
//   npm run staff -- unlock <email>                       clears "too many wrong passwords"
//   npm run staff -- suspend <email>  |  activate <email>
//
// Every change is written to the audit log (AuditEvent, actor "system / command line").

import fs from "node:fs";
import { randomBytes, scrypt as scryptCb } from "crypto";
import { promisify } from "util";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
const { PrismaClient } = await import("@prisma/client");
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
  let s = ""; for (const b of randomBytes(20)) s += abc[b % abc.length];
  return `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}
const fail = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };
const log = (action, s, meta = {}) => prisma.auditEvent.create({ data: { actorType: "system", actorLabel: "command line", action, resource: "staff", subjectId: s.id, meta: { email: s.email, ...meta } } });

const [cmd, emailArg, ...rest] = process.argv.slice(2);
const email = (emailArg || "").trim().toLowerCase();
async function staff() {
  if (!email) fail("Give the staff email.");
  const s = await prisma.staffUser.findUnique({ where: { email } });
  if (!s) fail(`No staff account for ${email}.`);
  return s;
}

async function main() {
  switch (cmd) {
    case "list": {
      const rows = await prisma.staffUser.findMany({ orderBy: { createdAt: "asc" }, include: { memberships: { include: { role: true } } } });
      if (!rows.length) return console.log("\nNo staff yet. Run: npm run db:seed\n");
      console.log("");
      for (const s of rows) {
        const type = s.memberships.some((m) => m.status === "active" && m.role.key === "super_admin") ? "super admin" : s.memberships.some((m) => m.status === "active") ? "admin" : "no access";
        const twoStep = !s.mfaRequired ? "password only" : s.mfaEnabledAt ? "2-step on" : "2-step at next sign-in";
        console.log(`${s.email.padEnd(32)} ${type.padEnd(12)} ${s.status.padEnd(10)} ${twoStep.padEnd(22)} last sign-in: ${s.lastLoginAt ? s.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "never"}`);
      }
      console.log("");
      break;
    }
    case "add": {
      // Emergency use: adds a SUPER ADMIN. Admins with chosen features are added in the console (Settings → Staff).
      const [name] = rest;
      if (!email || !/^([a-z0-9][a-z0-9._-]{2,39}|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(email)) fail("Give a username (3–40 letters/numbers) or an email.");
      if (!name) fail('Usage: npm run staff -- add <username> "<Full name>"');
      if (await prisma.staffUser.findUnique({ where: { email } })) fail(`${email} already exists.`);
      const pw = strongPassword();
      const s = await prisma.staffUser.create({ data: { email, name, passwordHash: await hashPassword(pw), status: "active", mfaRequired: false } });
      await prisma.membership.create({ data: { staffId: s.id, orgId: "org_neyu", roleId: "role_super_admin" } });
      await log("create", s, { role: "super_admin" });
      console.log(`\n✓ Added super admin ${email}.\n  Password (shown once — give it privately):\n     ${pw}\n  Change it after signing in (profile menu → Change password).\n`);
      break;
    }
    case "set-password": {
      const s = await staff();
      const pw = rest[0] || "";
      if (pw.length < 8) fail('Usage: npm run staff -- set-password <username> "<new password, 8+ characters>"');
      await prisma.staffUser.update({ where: { id: s.id }, data: { passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null } });
      await prisma.staffSession.deleteMany({ where: { staffId: s.id } });
      await log("update", s, { change: "password set" });
      console.log(`\n✓ Password changed for ${email}. They were signed out everywhere.\n`);
      break;
    }
    case "reset-password": {
      const s = await staff();
      const pw = strongPassword();
      await prisma.staffUser.update({ where: { id: s.id }, data: { passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null } });
      await prisma.staffSession.deleteMany({ where: { staffId: s.id } });
      await log("update", s, { change: "password reset" });
      console.log(`\n✓ New password for ${email} (shown once):\n     ${pw}\n  They were signed out everywhere.\n`);
      break;
    }
    case "reset-2step": {
      const s = await staff();
      await prisma.staffUser.update({ where: { id: s.id }, data: { mfaSecretEnc: null, mfaEnabledAt: null } });
      await prisma.staffSession.deleteMany({ where: { staffId: s.id } });
      await log("update", s, { change: "2-step code reset" });
      console.log(`\n✓ 2-step code reset for ${email}. Their next sign-in shows a new QR code.\n`);
      break;
    }
    case "unlock": {
      const s = await staff();
      await prisma.staffUser.update({ where: { id: s.id }, data: { failedLogins: 0, lockedUntil: null } });
      await log("update", s, { change: "unlocked" });
      console.log(`\n✓ ${email} unlocked.\n`);
      break;
    }
    case "suspend":
    case "activate": {
      const s = await staff();
      await prisma.staffUser.update({ where: { id: s.id }, data: { status: cmd === "suspend" ? "suspended" : "active" } });
      if (cmd === "suspend") await prisma.staffSession.deleteMany({ where: { staffId: s.id } });
      await log("update", s, { change: cmd });
      console.log(`\n✓ ${email} ${cmd === "suspend" ? "suspended and signed out" : "active again"}.\n`);
      break;
    }
    default:
      console.log(`
NEYU staff accounts
  npm run staff -- list
  npm run staff -- add <username> "<Full name>"          adds a SUPER ADMIN (admins: console → Settings → Staff)
  npm run staff -- set-password <username> "<password>"
  npm run staff -- reset-password <username>              makes a strong one
  npm run staff -- reset-2step <email>
  npm run staff -- unlock <email>
  npm run staff -- suspend <email>   |   activate <email>
`);
  }
}

main().catch((e) => { console.error("\n✗", e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
