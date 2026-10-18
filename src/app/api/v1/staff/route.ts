// GET  /api/v1/staff — staff, their type and features (super admins only)
// POST /api/v1/staff { username, name, password?, kind: "admin"|"super", features?, twoStep? }
//   password empty → a strong one is generated and returned once.
import { z } from "zod";
import { v1 } from "@backend/apiv1";
import { staffView, runStaffAction } from "@backend/staffAdmin";
import { FEATURE_KEYS } from "@backend/features";

const Create = z.object({
  username: z.string().trim().min(3).max(254),
  name: z.string().trim().min(2).max(80),
  password: z.string().max(200).optional(),
  kind: z.enum(["admin", "super"]),
  features: z.array(z.enum(FEATURE_KEYS as [string, ...string[]])).max(20).optional(),
  twoStep: z.boolean().optional(),
}).strict();

export const GET = v1({ perms: ["staff.invite"] }, async ({ admin }) => staffView(admin));

export const POST = v1({ perms: ["staff.invite"], body: Create }, async ({ admin, ip, body }) => runStaffAction({ action: "staff.create", ...body }, admin, ip));
