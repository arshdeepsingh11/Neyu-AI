// GET    /api/portal/avatar?v=N — the signed-in patient's photo (private, cached per version)
// PUT    /api/portal/avatar     — upload (raw image body; the browser resizes to 512px JPEG first)
// DELETE /api/portal/avatar     — remove photo
//
// Stored in the database (PatientPhoto) so it works on any host with no
// file storage. File type is verified from the bytes, not the header.

import { prisma } from "@backend/db";
import { audit } from "@backend/audit";
import { rateLimit } from "@backend/rateLimit";
import { withPatient, withPatientMutation, HttpError } from "@backend/apiHelpers";

const MAX_BYTES = 1_500_000;

function sniff(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export const GET = () => withPatient(async ({ patient }) => {
  const photo = await prisma.patientPhoto.findUnique({ where: { patientId: patient.id } });
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
});

export const PUT = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!(await rateLimit(`avatar:${patient.id}`, 10, 60 * 60 * 1000))) throw new HttpError(429, "Too many uploads. Please try again later.");
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BYTES) throw new HttpError(413, "Photo is too large (max 1.5 MB).");
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) throw new HttpError(400, "No photo received.");
  if (buf.length > MAX_BYTES) throw new HttpError(413, "Photo is too large (max 1.5 MB).");
  const mime = sniff(buf);
  if (!mime) throw new HttpError(415, "Please upload a JPEG, PNG or WebP image.");
  // Versions only ever grow (negative = photo removed), so a cached old
  // photo URL can never be reused for a new photo.
  const cur = await prisma.patient.findUniqueOrThrow({ where: { id: patient.id }, select: { photoVersion: true } });
  const [, updated] = await prisma.$transaction([
    prisma.patientPhoto.upsert({ where: { patientId: patient.id }, create: { patientId: patient.id, mime, data: buf }, update: { mime, data: buf } }),
    prisma.patient.update({ where: { id: patient.id }, data: { photoVersion: Math.abs(cur.photoVersion) + 1 }, select: { photoVersion: true } }),
  ]);
  audit(patient.id, "patient", "update", "photo", ip);
  return { photoUrl: `/api/portal/avatar?v=${updated.photoVersion}` };
});

export const DELETE = () => withPatientMutation(async ({ patient, ip }) => {
  const cur = await prisma.patient.findUniqueOrThrow({ where: { id: patient.id }, select: { photoVersion: true } });
  await prisma.$transaction([
    prisma.patientPhoto.deleteMany({ where: { patientId: patient.id } }),
    prisma.patient.update({ where: { id: patient.id }, data: { photoVersion: -Math.abs(cur.photoVersion) } }),
  ]);
  audit(patient.id, "patient", "delete", "photo", ip);
  return { photoUrl: null };
});
