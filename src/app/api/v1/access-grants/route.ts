// POST /api/v1/access-grants { target: "patient:<id>" | "area:<permission>", reason } — break-glass.
// Opens that patient (or area) for 60 minutes; the reason is saved in the audit log.
import { z } from "zod";
import { v1 } from "@backend/apiv1";
import { grantAccess, GRANT_MINUTES } from "@backend/access";

const Body = z.object({ target: z.string().regex(/^(patient:[\w-]{1,60}|area:[a-z.]{1,40})$/), reason: z.string().trim().min(5).max(300) }).strict();

export const POST = v1({ perms: null, body: Body }, async ({ admin, ip, body }) => {
  await grantAccess(admin, body.target, body.reason, ip);
  return { target: body.target, minutes: GRANT_MINUTES };
});
