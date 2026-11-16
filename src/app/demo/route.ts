import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const html = await readFile(path.join(process.cwd(), "src/demo/index.html"), "utf8");
  const reference = html
    .replace("Connecting to football service. Values below are a static preview until connected.", "Historical/static reference — displayed values are illustrative, not live predictions. Calculation and saving are disabled.")
    .replace('id="retry-connection"', 'id="retry-connection" disabled')
    .replace("Reconnect to football service", "Static reference only")
    .replace("Enable JavaScript to load predictions. These values are a static preview.", "Historical static preview. Use the product links for current predictions.")
    .replace("Live AI football prediction and match analysis", "Historical football interface reference")
    .replace('<header class="app-header">', '<nav aria-label="Current Women\'s World Cup views"><a href="/">Goal Stats</a> · <a href="/teams">Teams</a> · <a href="/matches">Matches</a> · <a href="/predictions">Predictions</a> · <a href="/analytics">Analytics</a></nav><header class="app-header">');
  return new Response(reference, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "connect-src 'none'; form-action 'none'" },
  });
}
