// What each background job does (backend/queue.ts adds them, backend/worker.ts runs them).
import type { JobName } from "@backend/queue";
import { prisma } from "@backend/db";
import { sendMail } from "@backend/email";

export async function runJob(name: JobName | string, data: any): Promise<unknown> {
  switch (name) {
    case "email.send": {
      await sendMail({ to: String(data.to), subject: String(data.subject), text: String(data.text), html: String(data.html), headers: data.headers });
      return { sent: true };
    }
    case "privacy.export": {
      const { buildExport } = await import("@backend/privacy");
      return buildExport(String(data.exportId));
    }
    case "privacy.deletion.run": {
      const { runDeletion } = await import("@backend/privacy");
      return runDeletion(String(data.requestId), data.force === true);
    }
    case "privacy.sweep": {
      const { privacySweep } = await import("@backend/privacy");
      return privacySweep();
    }
    case "sessions.cleanup": {
      const now = new Date();
      const [staff, patients] = await Promise.all([
        prisma.staffSession.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.patientSession.deleteMany({ where: { expiresAt: { lt: now } } }),
      ]);
      return { staffSessions: staff.count, patientSessions: patients.count };
    }
    case "daily": {
      const { runDaily } = await import("@backend/daily");
      const { publicBase } = await import("@backend/notify");
      return runDaily(publicBase());
    }
    default:
      throw new Error("Unknown job: " + name);
  }
}
