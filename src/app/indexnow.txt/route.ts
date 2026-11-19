// IndexNow key file (Bing, Yandex and others; Bing also powers ChatGPT search and
// Copilot). Serves INDEXNOW_KEY so search engines can confirm our submissions.
// Off (404) until INDEXNOW_KEY is set in .env. Submit pages with `npm run indexnow`.
export const dynamic = "force-dynamic";

export function GET() {
  const key = (process.env.INDEXNOW_KEY || "").trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
