/**
 * Búfer circular en memoria del tráfico interceptado.
 *
 * Guarda hasta `THYROX_INSPECTOR_BUFFER_SIZE` entradas (1000 por defecto) y
 * descarta la más antigua al llenarse. Al entrar una petición le calcula su
 * clase y su clave de contexto, y notifica cada cambio a los suscriptores
 * (los consumidores por WebSocket).
 *
 * Los cuerpos se recortan a `THYROX_INSPECTOR_MAX_BODY_KB` (1024 KiB por
 * defecto) y llevan un sufijo que lo dice, para que la interfaz no adivine.
 *
 * Porte de `omniroute: src/mitm/inspector/buffer.ts` (MIT).
 */

import { computeContextKey } from "./contextKey.ts";
import { detectKind } from "./kindDetector.ts";
import type { InterceptedRequest, ListFilters, WsEvent } from "./types.ts";
import { parseEnvNumber } from "../envNumber.ts";

const TRUNCATION_MARKER = "\n…(truncated for performance)";


function getMaxBodyBytes(): number {
  const kb = parseEnvNumber(process.env.THYROX_INSPECTOR_MAX_BODY_KB, 1024);
  return Math.max(1, Math.floor(kb)) * 1024;
}

function capBody(body: string | null, maxBytes: number): string | null {
  if (body == null) return body;
  if (body.length <= maxBytes) return body;
  return body.slice(0, maxBytes) + TRUNCATION_MARKER;
}

function statusBucket(status: InterceptedRequest["status"]): string {
  if (status === "error") return "error";
  if (status === "in-flight") return "in-flight";
  if (typeof status !== "number") return "unknown";
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "unknown";
}

function matchesFilters(req: InterceptedRequest, filters?: ListFilters): boolean {
  if (!filters) return true;

  if (filters.profile && filters.profile !== "all") {
    if (filters.profile === "llm" && req.detectedKind !== "llm") return false;
    if (filters.profile === "custom" && req.source !== "custom-host") return false;
  }

  if (filters.host && req.host !== filters.host) return false;
  if (filters.agent && req.agent !== filters.agent) return false;
  if (filters.source && req.source !== filters.source) return false;
  if (filters.sessionId && req.sessionId !== filters.sessionId) return false;

  if (filters.status) {
    const bucket = statusBucket(req.status);
    if (bucket !== filters.status) return false;
  }

  return true;
}

/**
 * El búfer con difusión. En producción hay uno por proceso
 * (`globalTrafficBuffer`); las pruebas crean los suyos.
 */
export class TrafficBuffer {
  private buffer: InterceptedRequest[] = [];
  private subscribers = new Set<(ev: WsEvent) => void>();
  private maxSize: number;
  private maxBodyBytes: number;

  constructor(
    maxSize: number = parseEnvNumber(process.env.THYROX_INSPECTOR_BUFFER_SIZE, 1000),
    maxBodyBytes: number = getMaxBodyBytes()
  ) {
    this.maxSize = Math.max(1, Math.floor(maxSize));
    this.maxBodyBytes = Math.max(1, Math.floor(maxBodyBytes));
  }

  /**
   * Añade una petición: completa su clase y su clave de contexto si faltan,
   * recorta los cuerpos y difunde un evento `new`.
   */
  push(req: InterceptedRequest): void {
    if (!req.detectedKind) {
      req.detectedKind = detectKind(req);
    }
    if (!req.contextKey && req.detectedKind === "llm") {
      const key = computeContextKey(req);
      if (key) req.contextKey = key;
    }

    req.requestBody = capBody(req.requestBody, this.maxBodyBytes);
    req.responseBody = capBody(req.responseBody, this.maxBodyBytes);

    this.buffer.push(req);
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }

    this.broadcast({ type: "new", data: req });
  }

  /**
   * Actualiza en su sitio la entrada con ese id y difunde `update`. Si el id
   * ya no está (por ejemplo, porque rotó), no hace nada.
   */
  update(id: string, req: InterceptedRequest): void {
    const idx = this.buffer.findIndex((r) => r.id === id);
    if (idx < 0) return;

    req.requestBody = capBody(req.requestBody, this.maxBodyBytes);
    req.responseBody = capBody(req.responseBody, this.maxBodyBytes);

    this.buffer[idx] = req;
    this.broadcast({ type: "update", data: req });
  }

  /** Busca por id recorriendo el búfer, que está acotado. */
  get(id: string): InterceptedRequest | null {
    return this.buffer.find((r) => r.id === id) ?? null;
  }

  /** Una copia filtrada del búfer; cada llamada devuelve un arreglo nuevo. */
  list(filters?: ListFilters): InterceptedRequest[] {
    if (!filters) return [...this.buffer];
    return this.buffer.filter((r) => matchesFilters(r, filters));
  }

  /** Vacía el búfer y lo notifica; los suscriptores se conservan. */
  clear(): void {
    this.buffer = [];
    this.broadcast({ type: "clear" });
  }

  /**
   * Registra un oyente, que recibe en el acto un `snapshot` del estado.
   * Devuelve la función que lo da de baja.
   */
  subscribe(fn: (ev: WsEvent) => void): () => void {
    this.subscribers.add(fn);
    try {
      fn({ type: "snapshot", data: [...this.buffer] });
    } catch {
      // Que falle el oyente de un snapshot no anula su suscripción.
    }
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /** Cuántos suscriptores hay, para pruebas y diagnóstico. */
  subscriberCount(): number {
    return this.subscribers.size;
  }

  /** Cuántas entradas hay, para pruebas y diagnóstico. */
  size(): number {
    return this.buffer.length;
  }

  private broadcast(ev: WsEvent): void {
    for (const fn of this.subscribers) {
      try {
        fn(ev);
      } catch {
        // Que falle un suscriptor no bloquea a los demás.
      }
    }
  }
}

/** El búfer del proceso, que leen el gancho del AgentBridge y el proxy HTTP. */
export const globalTrafficBuffer = new TrafficBuffer();
