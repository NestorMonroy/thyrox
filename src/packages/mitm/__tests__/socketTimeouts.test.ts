// Portado de omniroute: tests/unit/mitm-server-timeouts.test.ts (MIT), sobre bun:test.
/**
 * Gap 10: idle sockets must be destroyed after THYROX_MITM_IDLE_TIMEOUT_MS so hung
 * tunnels cannot exhaust file descriptors. We test the pure helper against a
 * fake socket (no real network).
 */
import { test } from "bun:test";
import assert from "node:assert/strict";
import { applyIdleTimeout, MITM_IDLE_TIMEOUT_MS } from "../src/socketTimeouts.ts";

test("MITM_IDLE_TIMEOUT_MS defaults to 60s (matches ProxyBridge relay timeout)", () => {
  assert.equal(MITM_IDLE_TIMEOUT_MS, 60000);
});

test("applyIdleTimeout sets the timeout and destroys the socket on fire", () => {
  let setMs = 0;
  let destroyed = false;
  let timeoutCb: (() => void) | null = null;
  const fakeSocket = {
    setTimeout(ms: number, cb: () => void) {
      setMs = ms;
      timeoutCb = cb;
    },
    destroy() {
      destroyed = true;
    },
  };
  applyIdleTimeout(fakeSocket as never, 1234);
  assert.equal(setMs, 1234, "must call setTimeout with the given ms");
  assert.equal(typeof timeoutCb, "function");
  (timeoutCb as unknown as () => void)();
  assert.equal(destroyed, true, "must destroy the socket when the idle timeout fires");
});

test("applyIdleTimeout uses MITM_IDLE_TIMEOUT_MS by default", () => {
  let setMs = 0;
  const fakeSocket = {
    setTimeout(ms: number) {
      setMs = ms;
    },
    destroy() {},
  };
  applyIdleTimeout(fakeSocket as never);
  assert.equal(setMs, MITM_IDLE_TIMEOUT_MS, "default must be the module constant");
});

test("THYROX_MITM_IDLE_TIMEOUT_MS declara el plazo; un valor no positivo cae al defecto", () => {
  const read = (value: string) =>
    Bun.spawnSync(["bun", "-e", "const m = await import('./src/socketTimeouts.ts'); console.log(m.MITM_IDLE_TIMEOUT_MS)"], {
      cwd: `${import.meta.dir}/..`,
      env: { ...process.env, THYROX_MITM_IDLE_TIMEOUT_MS: value },
    }).stdout.toString().trim();
  assert.equal(read("2500"), "2500");
  assert.equal(read("-1"), "60000");
  assert.equal(read("abc"), "60000");
});
