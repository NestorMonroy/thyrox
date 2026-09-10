/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/instrumentation.ts`
 * (14 líneas fuente, 100 % portado). Hooks de ciclo de vida no-op para
 * init/flush de OTel — el build externo tiene la telemetría
 * deshabilitada; la inicialización real vive en ramas ant-only
 * eliminadas del build público.
 */

export async function initializeTelemetry(): Promise<null> {
  return null
}

export async function flushTelemetry(): Promise<void> {}
