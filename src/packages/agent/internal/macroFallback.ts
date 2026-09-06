/**
 * Relleno de `globalThis.MACRO` — porte de
 * `ccnmt: packages/agent/internal/macroFallback.ts`.
 *
 * Red de seguridad load-bearing para correr bajo bun:test u otros
 * runtimes que no reciben los `MACRO` defines de build-time: varios
 * módulos importan `MACRO` a nivel de módulo (p. ej.
 * `if (MACRO.VERSION === '...')`), y si `MACRO` está `undefined` cuando
 * cargan, el import revienta con un `ReferenceError` antes de que corra
 * ningún test.
 *
 * DIVERGENCIA DE ALCANCE, declarada: el import `readEnv` de
 * `@claude-code-how-works/config/env` (paquete hermano ausente en este
 * árbol) NO se resuelve aquí. Ningún consumidor de este módulo lo
 * ejecuta todavía en este árbol —la única suite que lo referencia
 * (`__tests__/internalMacroFallback.behavior.test.ts`) lee este archivo
 * como texto plano (`readFileSync`), nunca lo importa—, así que dejar el
 * import tal cual (en vez de reimplementar `readEnv` localmente, como
 * hace `context.ts`) es lo que exige el porte del test: pinnea el import
 * literal contra la fuente, no contra un sustituto local.
 */
import { readEnv } from '@claude-code-how-works/config/env'

if (typeof globalThis.MACRO === 'undefined') {
  ;(globalThis as typeof globalThis & { MACRO: typeof MACRO }).MACRO = {
    VERSION: readEnv('CLAUDE_CODE_VERSION') || '1.carus.000',
    BUILD_TIME: new Date().toISOString(),
    FEEDBACK_CHANNEL: '',
    ISSUES_EXPLAINER: '',
    NATIVE_PACKAGE_URL: '',
    PACKAGE_URL: '',
    VERSION_CHANGELOG: '',
  }
}

export {}
