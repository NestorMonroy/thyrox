/**
 * El chequeo de cwd con que la capa `cli` del binario abre (`rt`, 2.1.282 y
 * 2.1.283; extraido con `bin/binary symbol cli rt` a
 * `.claude/workbench/entry-point-<fecha>/symbol/`).
 *
 * Un cwd borrado o ilegible no falla aqui sino mas adentro, en el primer
 * `process.cwd()` de cualquier modulo, con un rastro que no dice que hacer.
 * La capa de entrada lo mide antes que nada y da el mensaje accionable.
 *
 * El cwd se inyecta para que el caso se pueda probar sin borrar el
 * directorio del proceso que corre la suite.
 */
import { PRODUCT_NAME } from './productName.ts'
export function cwdUnavailableMessage(getCwd: () => string = () => process.cwd()): string | undefined {
  try {
    getCwd()
    return undefined
  } catch (error) {
    const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined
    if (code === 'ENOENT') {
      return `The current directory no longer exists (it was deleted or moved). Start ${PRODUCT_NAME} from an existing directory.`
    }
    return `Can't read the current directory${code ? ` (${code})` : ''}. Start ${PRODUCT_NAME} from a different directory.`
  }
}

/**
 * La rama completa de `rt` en la capa `cli`: mensaje por stderr, la linea
 * `result` si el cliente la pidio, y salida 1. Todo se inyecta porque en este
 * runtime el caso no se puede provocar de punta a punta — medido: Bun rehusa
 * arrancar desde un cwd borrado (su propio error, exit 1, antes de ejecutar
 * JS), y si el directorio se borra despues, `process.cwd()` devuelve la ruta
 * cacheada sin lanzar. Solo Node lanza `ENOENT`, y el binario conserva `rt`
 * porque su `cli` tambien corre bajo Node.
 */
export async function exitIfCwdUnavailable(io: {
  getCwd?: () => string
  writeError?: (message: string) => void
  writeResult?: (failure: { sessionId: string; message: string; reason: string }) => Promise<void>
  newSessionId?: () => string
  exit?: (code: number) => never
} = {}): Promise<void> {
  const message = cwdUnavailableMessage(io.getCwd)
  if (!message) return
  ;(io.writeError ?? (m => console.error(m)))(message)
  const writeResult = io.writeResult
    ?? (await import('./startupFailure.ts')).writeStartupFailureResult
  const newSessionId = io.newSessionId ?? (await import('node:crypto')).randomUUID
  await writeResult({ sessionId: newSessionId(), message, reason: 'cwd_unavailable' })
  ;(io.exit ?? (code => process.exit(code)))(1)
}
