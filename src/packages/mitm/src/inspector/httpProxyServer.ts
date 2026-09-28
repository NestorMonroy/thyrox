/**
 * El proxy `HTTP_PROXY` del inspector: recibe el tráfico de un cliente
 * configurado con `HTTP_PROXY=http://127.0.0.1:8080`. Dos caminos:
 *
 *  1. HTTP directo (sin CONNECT): lee el cuerpo, lo reenvía con `fetch()`,
 *     captura la respuesta y guarda el intercambio completo.
 *  2. CONNECT (túnel TLS): abre un puente TCP crudo para que HTTPS siga
 *     funcionando, pero sólo captura `host:puerto`; los cuerpos van cifrados y
 *     la entrada del búfer lleva un `note` que lo dice.
 *
 * Un `EADDRINUSE` al escuchar rechaza la promesa, para que quien llama dé un
 * error claro.
 *
 * Porte de `omniroute: src/mitm/inspector/httpProxyServer.ts` (MIT).
 */

import http from "node:http";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { sanitizeErrorMessage } from "@thyrox/provider/sanitize/errorSanitization";
import { isForbiddenUpstreamHeaderName } from "@thyrox/provider/proxy/upstreamHeaders";
import { sanitizeHeaders } from "../sanitizeHeaders.ts";
import { maskSecret } from "../maskSecrets.ts";
import { applyIdleTimeout, MITM_IDLE_TIMEOUT_MS } from "../socketTimeouts.ts";
import { globalTrafficBuffer } from "./buffer.ts";
import type { InterceptedRequest } from "./types.ts";

/** El puerto por defecto del proxy: `THYROX_INSPECTOR_HTTP_PROXY_PORT`, o 8080. */
export function defaultHttpProxyPort(): number {
  return parseEnvNumber(process.env.THYROX_INSPECTOR_HTTP_PROXY_PORT, 8080);
}

function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export interface HttpProxyServerHandle {
  port: number;
  server: http.Server;
  stop(): Promise<void>;
}

/**
 * Las cabeceras para el `fetch()` al upstream: sin las de salto a salto ni las
 * que revelan el origen, y con los valores múltiples unidos. A diferencia de
 * `sanitizeHeaders`, no enmascara `Authorization`: el upstream la necesita; el
 * enmascarado es sólo para lo que se guarda en el búfer.
 */
function buildFetchHeaders(raw: http.IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    if (isForbiddenUpstreamHeaderName(name)) continue;
    out[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  return out;
}

function safeUrl(rawUrl: string | undefined, hostHeader: string | undefined): URL | null {
  if (!rawUrl) return null;
  try {
    if (/^https?:\/\//i.test(rawUrl)) return new URL(rawUrl);
    if (hostHeader) return new URL(`http://${hostHeader}${rawUrl}`);
  } catch {
    return null;
  }
  return null;
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function handleHttp(req: http.IncomingMessage, res: http.ServerResponse): void {
  const startedAt = performance.now();
  const intercepted: InterceptedRequest = {
    id: randomUUID(),
    source: "http-proxy",
    timestamp: new Date().toISOString(),
    method: req.method ?? "GET",
    host: req.headers.host ?? "",
    path: req.url ?? "/",
    requestHeaders: sanitizeHeaders(req.headers),
    requestBody: null,
    requestSize: 0,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    status: "in-flight",
  };

  globalTrafficBuffer.push(intercepted);

  void (async () => {
    try {
      const target = safeUrl(req.url, req.headers.host);
      if (!target) {
        throw new Error("Invalid request URL");
      }
      intercepted.host = target.host;
      intercepted.path = target.pathname + target.search;

      const body = await readBody(req);
      intercepted.requestSize = body.length;
      intercepted.requestBody = body.length > 0 ? maskSecret(body.toString("utf8")) : null;

      const upstreamHeaders = buildFetchHeaders(req.headers);
      const upstream = await fetch(target.toString(), {
        method: req.method ?? "GET",
        headers: upstreamHeaders,
        body: body.length > 0 ? body : undefined,
        redirect: "manual",
      });

      const respBuf = Buffer.from(await upstream.arrayBuffer());
      const totalLatencyMs = performance.now() - startedAt;

      intercepted.responseHeaders = sanitizeHeaders(
        Object.fromEntries(upstream.headers) as Record<string, string>
      );
      intercepted.responseBody = maskSecret(respBuf.toString("utf8"));
      intercepted.responseSize = respBuf.length;
      intercepted.status = upstream.status;
      intercepted.totalLatencyMs = totalLatencyMs;
      intercepted.upstreamLatencyMs = totalLatencyMs;
      intercepted.proxyLatencyMs = 0;

      const safeRespHeaders: Record<string, string> = {};
      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === "content-length") return;
        if (key.toLowerCase() === "transfer-encoding") return;
        safeRespHeaders[key] = value;
      });
      res.writeHead(upstream.status, safeRespHeaders);
      res.end(respBuf);

      globalTrafficBuffer.update(intercepted.id, intercepted);
    } catch (err) {
      intercepted.status = "error";
      intercepted.error = sanitizeErrorMessage(err);
      intercepted.totalLatencyMs = performance.now() - startedAt;
      globalTrafficBuffer.update(intercepted.id, intercepted);
      if (!res.headersSent) {
        res.writeHead(502, { "content-type": "text/plain" });
        res.end("Bad Gateway");
      } else {
        res.end();
      }
    }
  })();
}

function handleConnect(
  req: http.IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer
): void {
  const target = req.url ?? "";
  const [host, rawPort] = target.split(":");
  const port = Number(rawPort) || 443;

  const intercepted: InterceptedRequest = {
    id: randomUUID(),
    source: "http-proxy",
    timestamp: new Date().toISOString(),
    method: "CONNECT",
    host,
    path: `:${port}`,
    requestHeaders: sanitizeHeaders(req.headers),
    requestBody: null,
    requestSize: 0,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    status: "in-flight",
    note: "TLS tunnel — for body capture, redirect host via Custom Hosts mode",
  };

  globalTrafficBuffer.push(intercepted);

  const targetSocket = net.connect(port, host);

  const finalize = (status: number | "error", err?: unknown): void => {
    intercepted.status = status;
    if (err !== undefined) intercepted.error = sanitizeErrorMessage(err);
    globalTrafficBuffer.update(intercepted.id, intercepted);
  };

  targetSocket.once("connect", () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length > 0) targetSocket.write(head);
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
    finalize(200);
  });

  const onError = (err: unknown): void => {
    finalize("error", err);
    try {
      clientSocket.end();
    } catch {
      // El socket ya estaba cerrado.
    }
    try {
      targetSocket.destroy();
    } catch {
      // Ya estaba destruido.
    }
  };

  targetSocket.once("error", onError);
  clientSocket.once("error", onError);
}

/**
 * Arranca el proxy. Resuelve con su control en cuanto escucha; si no puede
 * enlazar el puerto rechaza con `Error.code` (`EADDRINUSE` y similares).
 */
export function startHttpProxyServer(port: number = defaultHttpProxyPort()): Promise<HttpProxyServerHandle> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();

    // Se acota la vida de cada petición y se recogen los sockets inactivos,
    // para que un túnel colgado no agote los descriptores bajo carga.
    server.requestTimeout = MITM_IDLE_TIMEOUT_MS * 5;
    server.headersTimeout = MITM_IDLE_TIMEOUT_MS;
    server.keepAliveTimeout = MITM_IDLE_TIMEOUT_MS;
    server.on("connection", (socket) => applyIdleTimeout(socket));

    server.on("request", (req, res) => handleHttp(req, res));
    server.on("connect", (req, socket, head) => handleConnect(req, socket as net.Socket, head));

    server.once("error", (err: NodeJS.ErrnoException) => {
      // Con un código, quien llama distingue el error sin leer el mensaje.
      reject(Object.assign(err, { code: err.code ?? "ELISTEN" }));
    });

    server.once("listening", () => {
      const addr = server.address();
      const boundPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        port: boundPort,
        server,
        stop: () =>
          new Promise<void>((res) => {
            server.close(() => res());
          }),
      });
    });

    server.listen(port, "127.0.0.1");
  });
}
