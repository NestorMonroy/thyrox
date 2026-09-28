// Portado de omniroute: tests/unit/mitm-upstream-trust.test.ts (MIT), sobre bun:test, más
// los casos del efecto real: la CA tiene que llegar al fetch de Bun.
import { afterEach, test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { generateMitmCa, issueLeafCert } from "../../src/dynamicCert.ts";
import { configureUpstreamCa, resetUpstreamCaForTest, upstreamTls } from "../../src/upstreamTrust.ts";

test("configureUpstreamCa — no-op when pemPath is undefined", () => {
  assert.doesNotThrow(() => configureUpstreamCa(undefined));
});

test("configureUpstreamCa — no-op when pemPath is empty string", () => {
  assert.doesNotThrow(() => configureUpstreamCa(""));
});

test("configureUpstreamCa — throws structured error for non-existent path", () => {
  const fakePath = "/nonexistent/path/that/does/not/exist/ca.pem";
  try {
    configureUpstreamCa(fakePath);
    assert.fail("Should have thrown");
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok(!err.message.includes(" at /"), `Error message should not contain stack trace: ${err.message}`);
    assert.ok(err.message.includes(fakePath));
  }
});

test("configureUpstreamCa — error message contains THYROX_MITM_UPSTREAM_CA_CERT label", () => {
  const fakePath = "/no/such/file.pem";
  try {
    configureUpstreamCa(fakePath);
    assert.fail("Should have thrown");
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok(err.message.includes("THYROX_MITM_UPSTREAM_CA_CERT"));
  }
});

test("configureUpstreamCa — error does not embed multiline stack trace in message", () => {
  try {
    configureUpstreamCa("/definitely/does/not/exist.pem");
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok(!err.message.includes("\n    at "));
  }
});

// Un proxy corporativo firma con su propia CA: sin ella el fetch de Bun
// rechaza el certificado; configurada, el reenvío del inspector llega.
afterEach(() => resetUpstreamCaForTest());

test("configureUpstreamCa — the CA reaches the inspector proxy's upstream fetch", async () => {
  const ca = await generateMitmCa("corporate CA");
  const leaf = await issueLeafCert("localhost", ca);
  const upstream = https.createServer({ key: leaf.key, cert: leaf.cert }, (_q, r) => r.end("through"));
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "thyrox-upstream-ca-"));
  const pemPath = path.join(dir, "ca.pem");
  fs.writeFileSync(pemPath, ca.cert);
  const url = `https://localhost:${(upstream.address() as { port: number }).port}/`;
  try {
    await assert.rejects(() => fetch(url, { ...upstreamTls() }));
    configureUpstreamCa(pemPath);
    const res = await fetch(url, { ...upstreamTls() });
    assert.equal(await res.text(), "through");
  } finally {
    upstream.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("upstreamTls — empty until a CA is configured", () => {
  assert.deepEqual(upstreamTls(), {});
});
