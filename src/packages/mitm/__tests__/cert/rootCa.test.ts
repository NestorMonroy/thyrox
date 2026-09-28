// Portado de omniroute: tests/unit/mitm-root-ca-persistence-6684.test.ts (MIT), sobre bun:test; el directorio
// de datos lo declara THYROX_MITM_DATA_DIR y los certificados viven en él, sin `mitm/`.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { X509Certificate } from "node:crypto";

import { loadOrCreateMitmCa } from "../../src/cert/rootCa.ts";

// #6684: root-CA persistence — the OS trust prompt must only fire once per
// machine, so `loadOrCreateMitmCa()` must generate on first run and load
// (byte-identical) on every subsequent run, with a restrictively-permissioned
// private key file.

function tmpCertDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mitm-root-ca-test-"));
}

test("loadOrCreateMitmCa: first call with an empty dir generates and persists a CA", async () => {
  const certDir = tmpCertDir();
  try {
    assert.equal(fs.existsSync(path.join(certDir, "ca.key")), false);
    const ca = await loadOrCreateMitmCa(certDir);
    assert.ok(ca.key.includes("PRIVATE KEY"));
    assert.ok(ca.cert.includes("CERTIFICATE"));
    assert.equal(fs.existsSync(path.join(certDir, "ca.key")), true);
    assert.equal(fs.existsSync(path.join(certDir, "ca.crt")), true);
  } finally {
    fs.rmSync(certDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("loadOrCreateMitmCa: a second call loads the same CA instead of regenerating", async () => {
  const certDir = tmpCertDir();
  try {
    const first = await loadOrCreateMitmCa(certDir);
    const second = await loadOrCreateMitmCa(certDir);
    assert.equal(second.key, first.key);
    assert.equal(second.cert, first.cert);
  } finally {
    fs.rmSync(certDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test.skipIf(process.platform === "win32")(
  "loadOrCreateMitmCa: the written CA private key file mode is 0o600",
  async () => {
    const certDir = tmpCertDir();
    try {
      const ca = await loadOrCreateMitmCa(certDir);
      const mode = fs.statSync(ca.keyPath).mode & 0o777;
      assert.equal(mode, 0o600);
    } finally {
      fs.rmSync(certDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }
);

test("loadOrCreateMitmCa: the CA cert carries CA basicConstraints (matches generateMitmCa)", async () => {
  const certDir = tmpCertDir();
  try {
    const ca = await loadOrCreateMitmCa(certDir);
    const cert = new X509Certificate(ca.cert);
    assert.equal(cert.ca, true);
  } finally {
    fs.rmSync(certDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
