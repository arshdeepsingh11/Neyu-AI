// GET /api/v1/openapi.json — machine-readable description of /api/v1 (OpenAPI 3.1).
// Import into Postman, Swagger UI or any API client.
import { NextResponse } from "next/server";
import { API_VERSION } from "@backend/apiv1";

const err = { $ref: "#/components/schemas/Error" };
const ok = (schema: object) => ({ "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: schema, next: { type: ["string", "null"] } } } } } }, "401": { description: "Sign in first", content: { "application/json": { schema: err } } }, "403": { description: "Not allowed for your role, or reason_required (break-glass)", content: { "application/json": { schema: err } } } });

const spec = {
  openapi: "3.1.0",
  info: { title: "NEYU Health API", version: API_VERSION, description: "Staff API. Sign in like the admin console (POST /api/admin/login, then /api/admin/mfa); the session cookie is used. Every call is checked against your role and written to the audit log.", contact: { name: "NEYU Health", url: "https://neyuhealth.com" } },
  servers: [{ url: "https://neyuhealth.com" }, { url: "http://localhost:3000" }],
  components: {
    securitySchemes: { staffSession: { type: "apiKey", in: "cookie", name: "neyu_staff" } },
    schemas: {
      Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string", enum: ["bad_request", "validation_error", "unauthorized", "forbidden", "reason_required", "not_found", "conflict", "rate_limited", "server_error"] }, message: { type: "string" }, details: { type: "array" }, target: { type: "string" } }, required: ["code", "message"] } } },
      Patient: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, status: { type: "string" }, verified: { type: "boolean" }, createdAt: { type: "string", format: "date-time" }, lastLoginAt: { type: ["string", "null"] } } },
    },
  },
  security: [{ staffSession: [] }],
  paths: {
    "/api/v1/health": { get: { summary: "Platform health (no sign-in)", security: [], responses: ok({ type: "object", properties: { status: { type: "string" }, db: { type: "string" }, store: { type: "string" }, queue: { type: "string" }, storage: { type: "string" } } }) } },
    "/api/v1/me": { get: { summary: "Signed-in staff member, roles and permissions", responses: ok({ type: "object" }) } },
    "/api/v1/patients": { get: { summary: "List patients (patients.list)", parameters: [{ name: "q", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } }, { name: "cursor", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string", enum: ["active", "deactivated", "deletion_requested"] } }], responses: ok({ type: "array", items: { $ref: "#/components/schemas/Patient" } }) } },
    "/api/v1/patients/{id}": { get: { summary: "Patient summary (patients.record.read; break-glass for 'reason' roles)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: ok({ type: "object" }) } },
    "/api/v1/access-grants": { post: { summary: "Break-glass: open a patient or area for 60 minutes with a written reason", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["target", "reason"], properties: { target: { type: "string", example: "patient:abc123" }, reason: { type: "string", minLength: 5 } } } } } }, responses: ok({ type: "object" }) } },
    "/api/v1/audit": { get: { summary: "Platform audit log (audit.read)", parameters: ["q", "result", "reason", "action", "actorType", "from", "to", "cursor"].map((n) => ({ name: n, in: "query", schema: { type: "string" } })), responses: ok({ type: "array" }) } },
    "/api/v1/staff": {
      get: { summary: "Staff with their type and features (super admins only)", responses: ok({ type: "object" }) },
      post: { summary: "Add a super admin or an admin with chosen features (super admins only)", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["username", "name", "kind"], properties: { username: { type: "string", description: "username or email" }, name: { type: "string" }, password: { type: "string", minLength: 8, description: "empty = generated and returned once" }, kind: { type: "string", enum: ["admin", "super"] }, features: { type: "array", items: { type: "string", enum: ["overview", "inbox", "patients", "records", "edit_records", "referrals", "requests", "insights", "reports", "ai"] } }, twoStep: { type: "boolean" } } } } } }, responses: ok({ type: "object" }) },
    },
    "/api/v1/privacy": { get: { summary: "Account deletion requests and data exports", responses: ok({ type: "object" }) } },
  },
};

export const GET = () => NextResponse.json(spec, { headers: { "Cache-Control": "public, max-age=300" } });
