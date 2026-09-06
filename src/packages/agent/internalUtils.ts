/**
 * Utilidades puras del paquete de agente — porte PARCIAL de
 * `ccnmt: packages/agent/internalUtils.ts`.
 *
 * La fuente reemplaza imports directos de app-compat que violan las
 * fronteras V7 (§8 — `agent` no puede importar de `app-compat`); estas
 * implementaciones locales son el patrón aprobado para utilidades puras.
 *
 * Recorte declarado: la fuente trae además `isBareMode` (depende de
 * `readEnv` de `@claude-code-how-works/config/env`, inexistente en este
 * árbol) y `pathExists` (usa sólo `fs/promises`, portable, pero ningún caso
 * de `__tests__/internalUtils.test.ts` la ejercita). Ninguna de las dos entra
 * aquí — el porte se limita a los once símbolos que el test importa, todos
 * autocontenidos.
 */

// ── Utilidades de error ────────────────────────────────────────────────────

/** Extrae un mensaje de cadena de un valor tipo-error desconocido. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Extrae el código errno (p. ej. 'ENOENT', 'EACCES') de un error capturado. */
export function getErrnoCode(e: unknown): string | undefined {
  if (
    e &&
    typeof e === 'object' &&
    'code' in e &&
    typeof (e as Record<string, unknown>).code === 'string'
  ) {
    return (e as Record<string, string>).code
  }
  return undefined
}

/** True si el error es ENOENT (el archivo o directorio no existe). */
export function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT'
}

/**
 * True si el error significa que la ruta falta, es inaccesible, o
 * inalcanzable. Cubre ENOENT, EACCES, EPERM, ENOTDIR, ELOOP.
 */
export function isFsInaccessible(e: unknown): boolean {
  const code = getErrnoCode(e)
  return (
    code === 'ENOENT' ||
    code === 'EACCES' ||
    code === 'EPERM' ||
    code === 'ENOTDIR' ||
    code === 'ELOOP'
  )
}

// ── Utilidades de entorno ───────────────────────────────────────────────────

export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

export function isEnvDefinedFalsy(
  envVar: string | boolean | undefined,
): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  const normalizedValue = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalizedValue)
}

// ── Utilidades de JSON ───────────────────────────────────────────────────────

/**
 * Parsea JSON de forma segura. Devuelve null ante entrada inválida/vacía
 * (nunca lanza). `shouldLogError` se acepta por compatibilidad de API, pero
 * el error se traga en silencio.
 */
export function safeParseJSON(
  json: string | null | undefined,
  _shouldLogError?: boolean,
): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Envoltorio de JSON.stringify — funcionalmente equivalente, sin telemetría de operación lenta. */
export function jsonStringify(
  value: unknown,
  replacer?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | (number | string)[]
    | null,
  space?: string | number,
): string {
  return JSON.stringify(
    value,
    replacer as Parameters<typeof JSON.stringify>[1],
    space,
  )
}

// ── Utilidades de esquema ───────────────────────────────────────────────────

/** Fábrica singleton perezosa — evalúa `factory` una sola vez, en la primera llamada. */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

// ── Utilidades de arreglo ────────────────────────────────────────────────────

/** Cuenta los elementos de `arr` que satisfacen `pred`. */
export function count<T>(arr: T[], pred: (item: T) => boolean): number {
  let n = 0
  for (const item of arr) {
    if (pred(item)) n++
  }
  return n
}

// ── Utilidades de system prompt ─────────────────────────────────────────────

export type SystemPrompt = readonly string[] & {
  readonly __brand: 'SystemPrompt'
}

export function asSystemPrompt(value: readonly string[]): SystemPrompt {
  return value as SystemPrompt
}
