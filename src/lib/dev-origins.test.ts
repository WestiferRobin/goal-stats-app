// @vitest-environment node
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { blockCrossSiteDEV } from "next/dist/server/lib/router-utils/block-cross-site-dev";
import config from "../../next.config";

let server: Server;
let base: string;
beforeAll(async () => {
  server = createServer((req, res) => {
    // Exercise the installed Next.js guard with the actual application config
    // and Docker's binding hostname, rather than duplicating its origin rules.
    if (!blockCrossSiteDEV(req, res, config.allowedDevOrigins, "0.0.0.0")) {
      res.end("development resource allowed");
    }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test listener");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
it.each(["localhost", "127.0.0.1"])("allows development resources from %s", async host => {
  const response = await fetch(`${base}/_next/hmr`, { headers: { Origin: `http://${host}:3100` } });
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("development resource allowed");
});
it.each(["untrusted.example", "service.internal", "127.0.0.1.evil.example"])("rejects development resources from %s", async host => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    const response = await fetch(`${base}/_next/hmr`, { headers: { Origin: `http://${host}:3100` } });
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Unauthorized");
  } finally { warning.mockRestore(); }
});
