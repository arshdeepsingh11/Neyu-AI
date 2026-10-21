import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdmin, ADMIN_COOKIE } from "@backend/adminAuth";
import { endStaffSession } from "@backend/staffAuth";
import { adminLog } from "@backend/adminAudit";
import { clientMeta } from "@backend/patientAuth";

export async function POST() {
  const admin = await getAdmin();
  if (admin) {
    const { ip } = await clientMeta();
    await adminLog({ actor: admin.actor, staffId: admin.staff?.id, role: admin.role, ip, kind: "Account", action: "Signed out", resource: "Admin console" });
  }
  await endStaffSession(); // removes the session row too, so the cookie can't be reused
  (await cookies()).delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
