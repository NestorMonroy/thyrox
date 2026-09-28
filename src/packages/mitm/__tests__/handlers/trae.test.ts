// Portado de omniroute: tests/unit/mitm-handler-trae.test.ts (MIT), sobre bun:test.
import { test } from "bun:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { TraeHandler } from "../../src/handlers/trae.ts";

test("trae handler — intercept throws structured error (viability=investigating)", async () => {
  const h = new TraeHandler();
  const req = {
    method: "POST",
    url: "/x",
    headers: { host: "trae.invalid" },
  } as unknown as IncomingMessage;
  const res = {
    headersSent: false,
    writeHead() {},
    end() {},
  } as unknown as ServerResponse;

  await assert.rejects(
    () => h.intercept(req, res, Buffer.from("{}"), "gpt-4o"),
    /investigaci|no está implementado/i
  );
});
