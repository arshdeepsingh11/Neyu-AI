// GET /api/v1/audit?q=&result=success|denied&reason=1&from=YYYY-MM-DD&to=YYYY-MM-DD&cursor= — platform audit log.
import { z } from "zod";
import { v1, zCursor } from "@backend/apiv1";
import { platformAudit } from "@backend/auditData";

const Query = z.object({
  q: z.string().max(80).optional(), result: z.enum(["success", "denied", "error"]).optional(), reason: z.enum(["1"]).optional(),
  action: z.string().regex(/^[a-z_]{2,20}$/).optional(), actorType: z.string().regex(/^[a-z_]{2,20}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), cursor: zCursor,
}).strict();

export const GET = v1({ perms: ["audit.read"], query: Query }, async ({ query }) => {
  const sp = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][]);
  const r = await platformAudit(sp);
  return { data: r.rows, next: r.next };
});
