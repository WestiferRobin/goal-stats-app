import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const css = await readFile(path.join(process.cwd(), "src/demo/style.css"), "utf8");
  return new Response(css, {
    headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" },
  });
}
