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
