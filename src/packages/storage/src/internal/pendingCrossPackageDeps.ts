/**
 * Sustitutos locales de símbolos que, en `ccnmt` (el árbol de referencia,
 * `packages/storage/src/{path,windowsPaths,glob,xdg}.ts`), vienen de OTROS
 * paquetes del monorepo — `@claude-code-how-works/app-host` y
 * `@claude-code-how-works/config`. Ninguno de los dos está enlazado como
 * dependencia de workspace de `@thyrox/storage` (DEC-04: en este árbol
 * ningún paquete importa otro `@thyrox/*` por nombre todavía — mismo criterio
 * que documenta `@thyrox/command-runtime: src/skills/loadSkillsDir.ts`).
 *
 * Sustituciones, todas fieles a la fuente salvo lo que se anota:
 *
 * - `getCwd` — de `@claude-code-how-works/app-host/bootstrap/cwd.js`. La
 *   fuente resuelve un cwd por-agente vía `AsyncLocalStorage` (para que
 *   agentes concurrentes cada uno vea su propio directorio). Aquí se
 *   sustituye por `process.cwd()` con el mismo patrón de inyección de
 *   dependencias (DI) que ya usa `cache-paths.ts` de este mismo paquete
 *   (`setCwdFn`/`setDjb2HashFn`) — un setter de módulo, no un mock de
 *   import. Cuando `@thyrox/app-host` porte `bootstrap/cwd`, éste stub se
 *   retira y los módulos que lo usan importan el real.
 * - `getPlatform` — de `@claude-code-how-works/config/platform`. La fuente
 *   distingue wsl vs linux leyendo `/proc/version`; aquí sólo se distinguen
 *   `macos`/`windows`/`linux` por `process.platform` (wsl colapsa a
 *   `linux`). Ningún test de este porte ejercita la rama wsl.
 * - `readEnv` / `getAllEnv` — de `@claude-code-how-works/config/env/utils`.
 *   Fieles: `process.env[name]` y `{ ...process.env }`, verbatim a la
 *   fuente (ver su docstring: "Generic env var reader" / "Snapshot of the
 *   full environment").
 * - `memoize` — de `lodash-es/memoize.js` (npm, no del monorepo de
 *   referencia). `windowsPaths.ts` la usa una sola vez, para
 *   `findGitBashPath`, sin argumentos — el resolver por defecto de lodash
 *   sólo usa el primer argumento como llave, así que aquí basta "llamar una
 *   vez y cachear para siempre". No se instala `lodash-es` (mantiene el
 *   `package.json` de storage sin dependencias nuevas fuera de env-paths).
 * - `memoizeWithLRU` — de `@claude-code-how-works/config/memoize.js`, que a
 *   su vez depende de `lru-cache` (npm) y de
 *   `@claude-code-how-works/local-observability` (ni paquete ni npm dep
 *   presentes aquí). Reimplementación local con un `Map` como caché LRU
 *   (recency por reinserción, desalojo del más antiguo al superar
 *   `maxCacheSize`) — mismo contrato de firma
 *   `(f, cacheFn, maxCacheSize) => (...args) => Result` que consume
 *   `windowsPaths.ts`; sin los métodos `.cache.*` de la fuente porque
 *   ningún test de este porte los usa.
 * - `logForDebugging` — de
 *   `@claude-code-how-works/local-observability/debug.js`. Sustituida por
 *   un `console.error`/`console.warn` mínimo; ningún test ejercita las
 *   rutas que la llaman (son ramas de `findExecutable`/`setShellIfWindows`
 *   no invocadas por los tests de este porte, sólo citadas por el test de
 *   "source pins" como texto).
 */

export type Platform = 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'

let _getCwd: () => string = () => process.cwd()

export function getCwd(): string {
  return _getCwd()
}

export function setGetCwdFn(fn: () => string): void {
  _getCwd = fn
}

export function getPlatform(): Platform {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'linux') return 'linux'
  return 'unknown'
}

export function readEnv(name: string): string | undefined {
  return process.env[name]
}

export function getAllEnv(): Record<string, string | undefined> {
  return { ...process.env }
}

/**
 * Sustituto mínimo de `lodash-es/memoize.js` — sin resolver explícito, cachea
 * la primera llamada y devuelve siempre ese resultado. Alcanza para
 * `findGitBashPath`, que no recibe argumentos.
 */
export function memoize<Args extends unknown[], Result>(
  f: (...args: Args) => Result,
): (...args: Args) => Result {
  let called = false
  let cached: Result
  return (...args: Args): Result => {
    if (!called) {
      cached = f(...args)
      called = true
    }
    return cached
  }
}

/**
 * Sustituto mínimo de `@claude-code-how-works/config/memoize.js`'s
 * `memoizeWithLRU` — caché LRU por `Map` (recency por reinserción, desalojo
 * del más antiguo al superar `maxCacheSize`). Sin `.cache.clear/size/…`
 * porque ningún test de este porte los usa.
 */
export function memoizeWithLRU<Args extends unknown[], Result>(
  f: (...args: Args) => Result,
  cacheFn: (...args: Args) => string,
  maxCacheSize: number = 100,
): (...args: Args) => Result {
  const cache = new Map<string, Result>()
  return (...args: Args): Result => {
    const key = cacheFn(...args)
    if (cache.has(key)) {
      const value = cache.get(key)!
      // Reinsertar bumpea la recencia (Map preserva orden de inserción).
      cache.delete(key)
      cache.set(key, value)
      return value
    }
    const result = f(...args)
    if (cache.size >= maxCacheSize) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }
    cache.set(key, result)
    return result
  }
}

/**
 * Sustituto mínimo de
 * `@claude-code-how-works/local-observability/debug.js`'s
 * `logForDebugging`.
 */
export function logForDebugging(
  message: string,
  options?: { level?: 'warn' | 'error' },
): void {
  if (options?.level === 'warn') {
    console.warn(message)
    return
  }
  console.error(message)
}
