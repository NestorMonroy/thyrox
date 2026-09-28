// Portado de omniroute: tests/unit/agentbridge-antigravity-cert-hosts-6494.test.ts (MIT), sobre bun:test; el directorio
// de datos lo declara THYROX_MITM_DATA_DIR y los certificados viven en él, sin `mitm/`.
import { afterEach, test } from "bun:test";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!();
});
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { X509Certificate } from "node:crypto";

import { ANTIGRAVITY_TARGET } from "../../src/targets/antigravity.ts";
import { generateCert } from "../../src/cert/generate.ts";

// #6494: AgentBridge's MITM proxy terminates TLS locally for all 4 antigravity/cloudcode
// hosts (see `TARGET_HOSTS` in src/mitm/server.cjs), but the generated self-signed cert only
// carried a SAN entry for the first host (`daily-cloudcode-pa.googleapis.com`) — so the other
// 3 hosts served a cert whose CN/SAN didn't match, breaking interception for them
// (`curl -k https://cloudcode-pa.googleapis.com/` showed `CN=daily-cloudcode-pa.googleapis.com`).
//
// `ANTIGRAVITY_TARGET.hosts` is the single authoritative host list for antigravity — this test
// drives directly off it so it can never silently drift from the real registry.
const EXPECTED_HOSTS = ANTIGRAVITY_TARGET.hosts;

test("ANTIGRAVITY_TARGET.hosts covers all 4 known antigravity/cloudcode-pa hosts", () => {
  assert.deepEqual(
    [...EXPECTED_HOSTS].sort(),
    [
      "autopush-cloudcode-pa.sandbox.googleapis.com",
      "cloudcode-pa.googleapis.com",
      "daily-cloudcode-pa.googleapis.com",
      "daily-cloudcode-pa.sandbox.googleapis.com",
    ].sort()
  );
});

test("generateCert() issues a cert whose SAN list covers all 4 antigravity hosts", async () => {
  // Isolate DATA_DIR so this test never touches (or reuses) a real ~/.omniroute cert.
  const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-mitm-cert-6494-"));
  const previousDataDir = process.env.THYROX_MITM_DATA_DIR;
  process.env.THYROX_MITM_DATA_DIR = tmpDataDir;

  cleanups.push(() => {
    if (previousDataDir === undefined) delete process.env.THYROX_MITM_DATA_DIR;
    else process.env.THYROX_MITM_DATA_DIR = previousDataDir;
    fs.rmSync(tmpDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const { cert: certPath } = await generateCert();

  const pem = fs.readFileSync(certPath, "utf-8");
  const cert = new X509Certificate(pem);
  const san = cert.subjectAltName ?? "";

  for (const host of EXPECTED_HOSTS) {
    assert.ok(san.includes(host), `expected generated cert SAN to include "${host}" — got: ${san}`);
  }
});
