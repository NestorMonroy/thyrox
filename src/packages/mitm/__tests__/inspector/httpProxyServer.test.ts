// Portado de omniroute: tests/unit/inspector-http-proxy.test.ts (MIT), sobre bun:test.
import { test } from "bun:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { defaultHttpProxyPort, startHttpProxyServer } from "../../src/inspector/httpProxyServer.ts";
import { globalTrafficBuffer } from "../../src/inspector/buffer.ts";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { generateMitmCa, issueLeafCert } from "../../src/dynamicCert.ts";
import { configureUpstreamCa, resetUpstreamCaForTest } from "../../src/upstreamTrust.ts";

async function withUpstream(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return {
    port,
    close: () => new Promise<void>((res) => server.close(() => res())),
  };
}

async function withTcpServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = net.createServer((socket) => {
    socket.on("data", () => {
      socket.end("ok");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return {
    port,
    close: () => new Promise<void>((res) => server.close(() => res())),
  };
}

function sendThroughProxy(
  proxyPort: number,
  upstreamPort: number,
  method = "GET",
  extraHeaders = "",
  requestBody = ""
): Promise<{ status: number; body: string }> {
  // La petición en forma absoluta se escribe a mano sobre el socket, como lo
  // hace un cliente con HTTP_PROXY: el `http.request` de Bun, con un `path`
  // absoluto, ignora `host`/`port` y va directo al upstream (Node sí la manda
  // al proxy; medido en .claude/workbench/bun-http-absolute-path-probe-*).
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPort, "127.0.0.1");
    const chunks: Buffer[] = [];
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write(
        `${method} http://127.0.0.1:${upstreamPort}/test HTTP/1.1\r\n` +
          `Host: 127.0.0.1:${upstreamPort}\r\nConnection: close\r\n${extraHeaders}` +
          (requestBody ? `Content-Length: ${Buffer.byteLength(requestBody)}\r\n\r\n${requestBody}` : "\r\n")
      );
    });
    // El servidor node:http de Bun no cierra pese a `Connection: close`: la
    // respuesta se da por completa al leer su `Content-Length` o el último
    // trozo de la codificación chunked, no al cerrarse el socket.
    socket.on("data", (c) => {
      chunks.push(c);
      const raw = Buffer.concat(chunks).toString("utf8");
      const headEnd = raw.indexOf("\r\n\r\n");
      if (headEnd === -1) return;
      const head = raw.slice(0, headEnd);
      const payload = raw.slice(headEnd + 4);
      const length = head.match(/content-length:\s*(\d+)/i)?.[1];
      const chunked = /transfer-encoding:\s*chunked/i.test(head);
      const complete = chunked ? payload.includes("0\r\n\r\n") : Buffer.byteLength(payload) >= Number(length ?? 0);
      if (!complete) return;
      socket.destroy();
      const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] ?? 0);
      resolve({ status, body: chunked ? decodeChunked(payload) : payload });
    });
  });
}

function decodeChunked(payload: string): string {
  let out = "";
  let rest = payload;
  while (rest.length > 0) {
    const lineEnd = rest.indexOf("\r\n");
    const size = parseInt(rest.slice(0, lineEnd), 16);
    if (!size) break;
    out += rest.slice(lineEnd + 2, lineEnd + 2 + size);
    rest = rest.slice(lineEnd + 2 + size + 2);
  }
  return out;
}

function sendConnect(proxyPort: number, target: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPort, "127.0.0.1");
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`);
    });
    socket.once("data", (chunk) => {
      const line = chunk.toString("utf8").split("\r\n")[0];
      const m = line.match(/HTTP\/1\.1\s+(\d+)/);
      socket.end();
      resolve(m ? Number(m[1]) : 0);
    });
  });
}

test("HTTP direct passes through and records buffer entry", async () => {
  globalTrafficBuffer.clear();
  const upstream = await withUpstream((_req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("hello");
  });
  const proxy = await startHttpProxyServer(0);
  try {
    const sizeBefore = globalTrafficBuffer.size();
    const { status, body } = await sendThroughProxy(proxy.port, upstream.port);
    assert.equal(status, 200);
    assert.equal(body, "hello");
    // give buffer.update a tick (it runs inside async path)
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(globalTrafficBuffer.size() > sizeBefore);
    const entry = globalTrafficBuffer.list().at(-1);
    assert.ok(entry);
    assert.equal(entry.source, "http-proxy");
    assert.equal(entry.method, "GET");
    assert.equal(entry.status, 200);
    assert.match(entry.responseBody ?? "", /hello/);
  } finally {
    await proxy.stop();
    await upstream.close();
  }
});

test("CONNECT tunnel returns 200 and records metadata-only entry", async () => {
  globalTrafficBuffer.clear();
  const tcp = await withTcpServer();
  const proxy = await startHttpProxyServer(0);
  try {
    const sizeBefore = globalTrafficBuffer.size();
    const status = await sendConnect(proxy.port, `127.0.0.1:${tcp.port}`);
    assert.equal(status, 200);
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(globalTrafficBuffer.size() > sizeBefore);
    const entry = globalTrafficBuffer.list().at(-1);
    assert.ok(entry);
    assert.equal(entry.method, "CONNECT");
    assert.equal(entry.source, "http-proxy");
    assert.equal(entry.responseBody, null);
    assert.match(entry.note ?? "", /TLS tunnel/);
  } finally {
    await proxy.stop();
    await tcp.close();
  }
});

test("EADDRINUSE rejects with code", async () => {
  const first = await startHttpProxyServer(0);
  try {
    await assert.rejects(
      () => startHttpProxyServer(first.port),
      (err: NodeJS.ErrnoException) => {
        assert.ok(err);
        assert.equal(err.code, "EADDRINUSE");
        return true;
      }
    );
  } finally {
    await first.stop();
  }
});

test("THYROX_INSPECTOR_HTTP_PROXY_PORT sets the default port, a bad value falls back", () => {
  const previous = process.env.THYROX_INSPECTOR_HTTP_PROXY_PORT;
  try {
    process.env.THYROX_INSPECTOR_HTTP_PROXY_PORT = "18181";
    assert.equal(defaultHttpProxyPort(), 18181);
    process.env.THYROX_INSPECTOR_HTTP_PROXY_PORT = "0";
    assert.equal(defaultHttpProxyPort(), 8080);
    delete process.env.THYROX_INSPECTOR_HTTP_PROXY_PORT;
    assert.equal(defaultHttpProxyPort(), 8080);
  } finally {
    if (previous === undefined) delete process.env.THYROX_INSPECTOR_HTTP_PROXY_PORT;
    else process.env.THYROX_INSPECTOR_HTTP_PROXY_PORT = previous;
  }
});

test("HTTP direct forwards the auth header but no hop-by-hop or origin header", async () => {
  let seen: http.IncomingHttpHeaders = {};
  const upstream = await withUpstream((req, res) => {
    seen = req.headers;
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  });
  const proxy = await startHttpProxyServer(0);
  try {
    const { status } = await sendThroughProxy(
      proxy.port,
      upstream.port,
      "GET",
      "Authorization: Bearer keep-me\r\nProxy-Authorization: Basic drop-me\r\nX-Forwarded-For: 10.0.0.9\r\n"
    );
    assert.equal(status, 200);
    assert.equal(seen.authorization, "Bearer keep-me");
    assert.equal(seen["proxy-authorization"], undefined);
    assert.equal(seen["x-forwarded-for"], undefined);
  } finally {
    await proxy.stop();
    await upstream.close();
  }
});

test("HTTP direct forwards the request body and records it", async () => {
  let received = "";
  const upstream = await withUpstream((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received = Buffer.concat(chunks).toString("utf8");
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("done");
    });
  });
  const proxy = await startHttpProxyServer(0);
  try {
    const { status } = await sendThroughProxy(proxy.port, upstream.port, "POST", "", '{"q":1}');
    assert.equal(status, 200);
    assert.equal(received, '{"q":1}');
    await new Promise((r) => setTimeout(r, 30));
    const entry = globalTrafficBuffer.list().find((e) => e.method === "POST");
    assert.equal(entry?.requestBody, '{"q":1}');
  } finally {
    await proxy.stop();
    await upstream.close();
  }
});

test("HTTP direct to an https upstream trusts the configured corporate CA", async () => {
  const ca = await generateMitmCa("corporate CA");
  const leaf = await issueLeafCert("localhost", ca);
  const upstream = https.createServer({ key: leaf.key, cert: leaf.cert }, (_q, r) => r.end("secure"));
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const port = (upstream.address() as { port: number }).port;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "thyrox-proxy-ca-"));
  fs.writeFileSync(path.join(dir, "ca.pem"), ca.cert);
  const proxy = await startHttpProxyServer(0);
  const get = () =>
    new Promise<number>((resolve, reject) => {
      const socket = net.connect(proxy.port, "127.0.0.1");
      socket.once("error", reject);
      socket.once("connect", () =>
        socket.write(`GET https://localhost:${port}/ HTTP/1.1\r\nHost: localhost:${port}\r\nConnection: close\r\n\r\n`)
      );
      socket.once("data", (c) => {
        socket.destroy();
        resolve(Number(c.toString("utf8").match(/^HTTP\/1\.1\s+(\d+)/)?.[1] ?? 0));
      });
    });
  try {
    assert.equal(await get(), 502);
    configureUpstreamCa(path.join(dir, "ca.pem"));
    assert.equal(await get(), 200);
  } finally {
    resetUpstreamCaForTest();
    await proxy.stop();
    upstream.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
