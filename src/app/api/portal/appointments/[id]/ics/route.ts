// GET /api/portal/appointments/:id/ics — "Add to calendar" (.ics file)
import { prisma } from "@backend/db";
import { withPatient, HttpError } from "@backend/apiHelpers";

const esc = (s: string) => s.replace(/[\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const GET = (_req: Request, ctx: { params: Promise<{ id: string }> }) => withPatient(async ({ patient }) => {
  const { id } = await ctx.params;
  const a = await prisma.appointment.findFirst({ where: { id, patientId: patient.id } });
  if (!a) throw new HttpError(404, "Appointment not found.");
  const end = new Date(a.startsAt.getTime() + a.durationMin * 60000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NEYU Health//My Health Space//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${a.id}@neyuhealth.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(a.startsAt)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${a.title} — ${a.clinician}`)}`, `LOCATION:${esc(a.location)}`, "DESCRIPTION:NEYU Health appointment. Call 403-475-4475 to make changes.",
    "BEGIN:VALARM", "TRIGGER:-PT24H", "ACTION:DISPLAY", "DESCRIPTION:NEYU Health appointment tomorrow", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="anra-appointment.ics"`, "Cache-Control": "private, no-store" } });
});
