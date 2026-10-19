// Runs once when the server starts. Starts the background worker inside the web
// server unless RUN_WORKER=0 (then run `npm run worker` separately). With PM2 cluster
// mode (several copies of the app on one machine) only the first copy runs it.
// The import must sit inside this `if`: Next.js also compiles this file for the Edge
// runtime (dev mode), and only an `if` block lets it drop the Node-only worker code.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNodeWorker } = await import("./instrumentation-node");
    await startNodeWorker();
  }
}
