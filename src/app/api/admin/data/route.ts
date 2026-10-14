// GET /api/admin/data?view=… — read models for the admin console.
// Staff sign-in required. Opening a patient or visitor record (log=1) and
// opening an AI item are recorded in the audit log.

import { NextResponse } from "next/server";
import { requireAdmin } from "@backend/adminAuth";
import { adminLog } from "@backend/adminAudit";
import { clientMeta } from "@backend/patientAuth";
import { toResponse, HttpError, NO_STORE } from "@backend/apiHelpers";
import * as data from "@backend/adminData";
import { backfillVisitors } from "@backend/visitors";

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { actor } = admin;
    const who = { actor, role: admin.role, staffId: admin.staff?.id };
    const { ip } = await clientMeta();
    const q = new URL(req.url).searchParams;
    const view = q.get("view") || "";
    const id = (q.get("id") || "").slice(0, 80);
    const range = q.get("range"), from = q.get("from"), to = q.get("to");
    let out: unknown;

    switch (view) {
      case "boot": out = await data.boot(actor, admin.role); break;
      case "overview": out = await data.overview(range, from, to); break;
      case "inbox": out = { queue: await data.loadQueue() }; break;
      case "analytics": out = await data.analytics(range, from, to); break;
      case "patients": out = { rows: await data.patientsList() }; break;
      case "patient": {
        const p = await data.patient360(id);
        if (!p) throw new HttpError(404, "Patient not found.");
        if (q.get("log") === "1") await adminLog({ ...who, ip, kind: "View", action: "Opened Patient 360", resource: "Patient record", subjectType: "patient", subjectId: p.id, subject: p.name });
        out = p;
        break;
      }
      case "visitors": {
        await backfillVisitors(); // older activity recorded before visitor records existed
        out = { rows: await data.visitorsList() };
        break;
      }
      case "visitor": {
        const v = await data.visitorRecord(id);
        if (!v) throw new HttpError(404, "Visitor not found.");
        if (q.get("log") === "1") await adminLog({ ...who, ip, kind: "View", action: "Opened visitor record", resource: "Visitor record", subjectType: "visitor", subjectId: v.id, subject: "Visitor " + v.id });
        out = v;
        break;
      }
      case "referrals": out = { rows: await data.referralsList() }; break;
      case "referral": {
        const r = await data.referralDetail(id);
        if (!r) throw new HttpError(404, "Referral not found.");
        if (q.get("log") === "1") await adminLog({ ...who, ip, kind: "View", action: "Viewed referral", resource: "Referral " + r.code, subjectType: "referral", subjectId: r.id, subject: r.patient });
        out = r;
        break;
      }
      case "requests": out = { rows: await data.requestsList() }; break;
      case "ai": out = { rows: await data.aiList() }; break;
      case "ai-item": {
        const a = await data.aiDetail(id);
        if (!a) throw new HttpError(404, "Item not found.");
        const what = { symptom: "symptom check", alba: "Neyu conversation", assessment: "assessment", lab: "lab explainer" }[a.kind];
        await adminLog({ ...who, ip, kind: "View", action: "Viewed " + what, resource: "AI · " + a.id, subjectType: a.isVisitor ? "visitor" : "patient", subjectId: a.whoId, subject: a.who });
        out = a;
        break;
      }
      case "audit": out = { rows: await data.auditList() }; break;
      case "audit-item": {
        const e = await data.auditItem(id);
        if (!e) throw new HttpError(404, "Event not found.");
        out = e;
        break;
      }
      case "settings": out = await data.settings(); break;
      case "search": out = await data.search((q.get("q") || "").slice(0, 80)); break;
      case "unlinked-referrals": out = { rows: (await data.referralsList()).filter((r) => !r.pid) }; break;
      default: throw new HttpError(400, "Unknown view.");
    }
    return NextResponse.json(out, { headers: NO_STORE });
  } catch (e) {
    return toResponse(e);
  }
}
