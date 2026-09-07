/**
 * Consulta segura de un matcher `.gitignore` — porte de
 * `ccnmt: packages/swarm/src/worktree/safeIgnore.ts`.
 *
 * Porte VERBATIM: la única dependencia es el tipo de la librería `ignore`
 * (MIT, terceros — ya declarada como dependencia real de
 * `@thyrox/storage`; aquí se añade como dependencia propia del paquete,
 * sin tocar ningún `package.json` ajeno).
 */
import type ignore from 'ignore'

/**
 * Consulta `matcher.ignores(path)` sin dejar que una excepción del
 * matcher (patrón malformado, etc.) tumbe al llamador — un `false`
 * conservador es preferible a propagar el error en un chequeo de mejor
 * esfuerzo.
 */
export function safelyIgnored(
  matcher: ReturnType<typeof ignore>,
  path: string,
): boolean {
  try {
    return matcher.ignores(path)
  } catch {
    return false
  }
}
