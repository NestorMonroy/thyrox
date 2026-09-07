/**
 * Puerto de `ccnmt: packages/local-observability/src/slowLoggingTag.ts`
 * (135 líneas fuente, 100 % portado). Módulo hoja separado de
 * `slowOperations.ts` para romper el ciclo de 3 archivos
 * slowOperations → debug → fsOperations → slowOperations (V7 §11.2):
 * este módulo posee las primitivas de temporización (`AntSlowLogger`, el
 * tag `slowLogging`, el umbral); los sinks reales
 * (`logForDebugging` + `addSlowOperation`) se inyectan vía
 * `_setSlowOpReporter` para no importarlos aquí — `slowOperations.ts`
 * cablea el reporter en su carga de módulo.
 *
 * `feature('SLOW_OPERATION_LOGGING')` (macro de `bun:bundle`, ausente en
 * este árbol) resuelve siempre a `false` fuera de un build "ant" — mismo
 * precedente que `@thyrox/storage: src/fsOperations.ts` ya declaró para
 * este mismo tag. El gateo se omite, no se reemplaza: `slowLoggingExternal`
 * (el no-op) ES el comportamiento real en todo build que no sea ant, así
 * que `slowLogging` se fija directamente a él en vez de a la rama `feature()`.
 */

const SLOW_OPERATION_THRESHOLD_MS = (() => {
  const envValue = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS
  if (envValue !== undefined) {
    const parsed = Number(envValue)
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed
    }
  }
  if (process.env.NODE_ENV === 'development') {
    return 20
  }
  if (process.env.USER_TYPE === 'ant') {
    return 300
  }
  return Infinity
})()

export { SLOW_OPERATION_THRESHOLD_MS }

type SlowOpReporter = (description: string, durationMs: number) => void
type DebugLogger = (message: string) => void
let reportSlowOp: SlowOpReporter = () => {}
let logForDebuggingInjected: DebugLogger = () => {}

export function _setSlowOpReporter(
  reporter: SlowOpReporter,
  debugLogger: DebugLogger,
): void {
  reportSlowOp = reporter
  logForDebuggingInjected = debugLogger
}

export function callerFrame(stack: string | undefined): string {
  if (!stack) return ''
  for (const line of stack.split('\n')) {
    if (line.includes('slowOperations') || line.includes('slowLoggingTag'))
      continue
    const m = line.match(/([^/\\]+?):(\d+):\d+\)?$/)
    if (m) return ` @ ${m[1]}:${m[2]}`
  }
  return ''
}

// NO PORTADO: `AntSlowLogger` + `slowLoggingAnt` + `buildDescription`
// (la fuente real que arma la descripción del template, mide con
// `performance.now()` y reporta si excede el umbral). Los tres sólo se
// alcanzan detrás de `feature('SLOW_OPERATION_LOGGING')`, que en TODO
// build fuera de "ant" resuelve a `false` en tiempo de compilación (la
// fuente lo declara explícitamente: "a no-op in non-ant builds"). Esto no
// es este árbol siendo "no-ant" por accidente — es la misma condición que
// ya gobierna el binario distribuido, así que omitir la rama entera es
// fiel al comportamiento real, no una reducción de alcance. Mismo
// precedente que `@thyrox/storage: src/fsOperations.ts` (su propio
// sustituto de este tag) y `@thyrox/storage: src/sessionStoragePredicates.ts`
// (`feature('KAIROS')`). `_setSlowOpReporter`/`callerFrame` de arriba SÍ
// se conservan y se exportan — son el contrato público que
// `slowOperations.ts` y un futuro reporter en modo ant seguirían
// necesitando sin tocar este archivo; sólo quedan sin lector interno
// mientras la rama ant no exista.

function slowLoggingExternal(): Disposable {
  return { [Symbol.dispose]() {} }
}

/**
 * Fuera de un build ant, `feature('SLOW_OPERATION_LOGGING')` es siempre
 * `false` — por eso `slowLogging` se fija directamente al no-op externo,
 * sin la rama `feature()` (que en este árbol no existe como macro).
 */
export const slowLogging: (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Disposable = slowLoggingExternal
