// POST /api/pair/claim { code } — called by the phone after scanning the QR.
// One use only: issues a new private sync link for that device (the old
// token stops working) and returns the NEYU Sync shortcut link if configured.
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@backend/db";
import { sha256, clientMeta, assertSameOrigin } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { publicBase } from "@backend/publicBase";
import { DEVICE_CATALOG } from "@/lib/portal/devices";
import { readJson, toResponse, HttpError } from "@backend/apiHelpers";

export async function POST(req: Request) {
  try {
    await assertSameOrigin();
    const { ip } = await clientMeta();
    if (!(await rateLimit(`pair-claim:${ip}`, 10, 60_000))) throw new HttpError(429, "Too many tries — wait a minute.");
    const code = String((await readJson(req)).code || "").slice(0, 64);
    const row = code ? await prisma.devicePairing.findUnique({ where: { codeHash: sha256(code) } }) : null;
    if (!row) throw new HttpError(404, "This QR code isn't valid. Make a new one on your computer.");
    if (row.usedAt) throw new HttpError(410, "This QR code was already used. Make a new one on your computer.");
    if (row.expiresAt < new Date()) throw new HttpError(410, "This QR code expired. Make a new one on your computer.");
    const dev = DEVICE_CATALOG.find((d) => d.id === row.provider)!;
    const token = "anra_dev_" + randomBytes(24).toString("base64url");
    const claimed = await prisma.devicePairing.updateMany({ where: { codeHash: row.codeHash, usedAt: null }, data: { usedAt: new Date() } });
    if (!claimed.count) throw new HttpError(410, "This QR code was already used. Make a new one on your computer.");
    await prisma.deviceConnection.upsert({
      where: { patientId_provider: { patientId: row.patientId, provider: row.provider } },
      create: { patientId: row.patientId, provider: row.provider, status: "pending", tokenHash: sha256(token), tokenHint: token.slice(-4), dataTypes: JSON.stringify(dev.signals.map((s) => s.label)) },
      update: { status: "pending", tokenHash: sha256(token), tokenHint: token.slice(-4), lastAttemptAt: null, lastResult: null },
    });
    audit(row.patientId, "patient", "create", `device-paired:${row.provider}`, ip);
    const { base, local } = publicBase(req);
    return NextResponse.json({
      syncLink: `${base}/api/wearables/ingest?k=${token}`,
      shortcutUrl: (process.env.IOS_SHORTCUT_URL || "").trim() || null,
      device: dev.name, provider: row.provider, local,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return toResponse(e); }
}
