// GET  /api/v1/staff — staff, roles and the permission catalogue (staff.invite or staff.roles.manage)
// POST /api/v1/staff { email, name, role } — add a staff member; the one-time password is in the response.
import { z } from "zod";
import { v1 } from "@backend/apiv1";
import { staffView, runStaffAction } from "@backend/staffAdmin";

const Invite = z.object({ email: z.string().email().max(254), name: z.string().trim().min(2).max(80), role: z.enum(["super_admin", "org_admin", "clinic_manager", "care_staff", "physician", "support"]) }).strict();

export const GET = v1({ perms: ["staff.invite", "staff.roles.manage"] }, async ({ admin }) => staffView(admin));

export const POST = v1({ perms: ["staff.invite"], body: Invite }, async ({ admin, ip, body }) => runStaffAction({ action: "staff.invite", ...body }, admin, ip));
