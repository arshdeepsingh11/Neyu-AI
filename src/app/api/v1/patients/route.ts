// GET /api/v1/patients?q=&limit=25&cursor= — patients of your organization (newest first).
// Needs patients.list. Cursor pagination: pass `next` from the previous page.
import { z } from "zod";
import { prisma } from "@backend/db";
import { v1, zCursor, zLimit } from "@backend/apiv1";
import { adminLog } from "@backend/adminAudit";

const Query = z.object({ q: z.string().trim().max(80).optional(), limit: zLimit, cursor: zCursor, status: z.enum(["active", "deactivated", "deletion_requested"]).optional() }).strict();

export const GET = v1({ perms: ["patients.list"], query: Query }, async ({ admin, ip, query }) => {
  const orgId = admin.staff?.orgId || "org_neyu";
  const rows = await prisma.patient.findMany({
    where: {
      orgId,
      ...(query.status ? { accountStatus: query.status } : {}),
      ...(query.q ? { OR: [{ firstName: { contains: query.q, mode: "insensitive" } }, { lastName: { contains: query.q, mode: "insensitive" } }, { email: { contains: query.q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, lastLoginAt: true, accountStatus: true, emailVerifiedAt: true },
  });
  const more = rows.length > query.limit;
  const page = rows.slice(0, query.limit);
  await adminLog({ actor: admin.actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "View", action: "API · listed patients", resource: "Patient list", subject: `${page.length} patients` });
  return {
    data: page.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim(), email: p.email, status: p.accountStatus, verified: !!p.emailVerifiedAt, createdAt: p.createdAt.toISOString(), lastLoginAt: p.lastLoginAt?.toISOString() || null })),
    next: more ? page[page.length - 1].id : null,
  };
});
