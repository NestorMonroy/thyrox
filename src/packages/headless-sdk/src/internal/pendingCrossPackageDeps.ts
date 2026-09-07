/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia,
 * `packages/headless-sdk/src/**`), vienen de OTROS paquetes del monorepo —
 * `@claude-code-how-works/{tool-registry,local-observability,agent}`.
 * Mismo patrón que `@thyrox/storage: src/internal/pendingCrossPackageDeps.ts`
 * y `@thyrox/local-observability: src/internal/pendingCrossPackageDeps.ts`:
 * un archivo consolidado, cada entrada documentada con su cita de origen, su
 * divergencia exacta y su condición de retiro. `@thyrox/headless-sdk` no es
 * miembro del bun workspace (`src/packages/package.json`), así que —por
 * DEC-04— ningún `@thyrox/*` resuelve desde este paquete aunque el hermano
 * ya exporte el subpath real; se probó en vivo antes de escribir este
 * archivo (`Cannot find module '@thyrox/agent/abortController'`).
 *
 * Tres formas, no una — cada bloque dice cuál:
 *
 * 1. REIMPLEMENTACIÓN FIEL — el símbolo es puro/simple y su cuerpo real
 *    cabe aquí verbatim (o casi). Se retira cuando el paquete hermano
 *    exporte el subpath real Y `headless-sdk` sea miembro del workspace.
 * 2. PUNTO DE INYECCIÓN — el símbolo pertenece de verdad a OTRO dominio
 *    (el pipeline real de telemetría de `local-observability`). Default
 *    inocuo (no-op) + setter. NUNCA se reimplementa la lógica real aquí.
 *
 * - `lazySchema` — de
 *   `@claude-code-how-works/tool-registry/utils/lazySchema.js`. Verbatim a
 *   `@thyrox/agent: internalUtils.ts:114-117` (fábrica singleton perezosa:
 *   evalúa `factory` una sola vez, cachea el resultado). `internalUtils.ts`
 *   no está en el `exports` de `@thyrox/agent`, y aunque lo estuviera
 *   `headless-sdk` no podría resolverlo (no es miembro del workspace) — las
 *   dos condiciones de la forma 1 fallan a la vez.
 * - `logEvent` — de `@claude-code-how-works/local-observability` (root:
 *   `logEvent(name, metadata?)`, ver `@thyrox/local-observability:
 *   src/core.ts:79-81`). Único uso: `sdkMemorySummary.ts` emite el evento
 *   `tengu_sdk_memory_summary` al cierre del proceso, envuelto en
 *   `try/catch` en la propia fuente porque "puede no estar cableado en
 *   harnesses de test". Default no-op + setter (`setLogEventFn`), mismo
 *   patrón DI que `setGetCwdFn` de `@thyrox/storage`. Se retira cuando
 *   `headless-sdk` sea miembro del workspace (`local-observability` YA
 *   exporta `.` con `logEvent`; sólo falta la membresía).
 */

/** Fábrica singleton perezosa — evalúa `factory` una sola vez, en la primera llamada. */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

let _logEvent: (name: string, metadata?: Record<string, unknown>) => void =
  () => {}

/** Sustituto de `@claude-code-how-works/local-observability`'s `logEvent` — no-op hasta que se inyecte. */
export function logEvent(
  name: string,
  metadata?: Record<string, unknown>,
): void {
  _logEvent(name, metadata)
}

/** Inyecta el `logEvent` real (o un capturador de test). Ver `setGetCwdFn` en `@thyrox/storage` para el mismo patrón. */
export function setLogEventFn(
  fn: (name: string, metadata?: Record<string, unknown>) => void,
): void {
  _logEvent = fn
}
