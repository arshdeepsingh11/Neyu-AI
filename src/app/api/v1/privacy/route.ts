// GET /api/v1/privacy — account deletion requests (30-day hold) and data exports.
import { v1 } from "@backend/apiv1";
import { privacyAdminView } from "@backend/privacy";

export const GET = v1({ perms: ["privacy.deletion.manage", "privacy.export.manage"] }, async () => privacyAdminView());
