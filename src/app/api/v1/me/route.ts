// GET /api/v1/me — the signed-in staff member, their roles and permissions.
import { v1 } from "@backend/apiv1";
import { permsFor } from "@backend/access";

export const GET = v1({ perms: null }, async ({ admin }) => ({
  email: admin.actor, name: admin.staff?.name || admin.actor, role: admin.role, ...permsFor(admin),
}));
