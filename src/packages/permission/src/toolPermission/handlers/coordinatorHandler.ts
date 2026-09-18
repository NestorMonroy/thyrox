import { feature } from 'bun:bundle'
import type { PendingClassifierCheck } from '../../permissionTypes.js'
import { logError } from '@claude-code-how-works/local-observability/logging'
import type { PermissionDecision } from '../../PermissionResult.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import type { PermissionContext } from '../PermissionContext.js'

type CoordinatorPermissionParams = {
  ctx: PermissionContext
  pendingClassifierCheck?: PendingClassifierCheck | undefined
  updatedInput: Record<string, unknown> | undefined
  suggestions: PermissionUpdate[] | undefined
  permissionMode: string | undefined
}

/**
 * Copia de `ccnmt: packages/permission/src/toolPermission/handlers/coordinatorHandler.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Atiende el flujo de permiso del trabajador coordinador.
 *
 * En un trabajador coordinador, las comprobaciones automáticas —los hooks y el
 * clasificador— se esperan en secuencia antes de caer al diálogo interactivo.
 *
 * Devuelve una `PermissionDecision` si las comprobaciones automáticas
 * resolvieron el permiso, o null si quien llama debe caer al diálogo
 * interactivo.
 */
async function handleCoordinatorPermission(
  params: CoordinatorPermissionParams,
): Promise<PermissionDecision | null> {
  const { ctx, updatedInput, suggestions, permissionMode } = params

  try {
    // 1. Probar primero los hooks de permiso (rápidos y locales)
    const hookResult = await ctx.runHooks(
      permissionMode,
      suggestions,
      updatedInput,
    )
    if (hookResult) return hookResult

    // 2. Probar el clasificador (lento, es inferencia — sólo para bash)
    const classifierResult = feature('BASH_CLASSIFIER')
      ? await ctx.tryClassifier?.(params.pendingClassifierCheck, updatedInput)
      : null
    if (classifierResult) {
      return classifierResult
    }
  } catch (error) {
    // Si las comprobaciones automáticas fallan de forma inesperada, caer a
    // mostrar el diálogo para que el usuario decida a mano. Lo que se lance y
    // no sea un `Error` recibe un prefijo de contexto para que el registro sea
    // trazable — a propósito NO se usa `toError()`, que descartaría ese
    // prefijo.
    if (error instanceof Error) {
      logError(error)
    } else {
      logError(new Error(`Automated permission check failed: ${String(error)}`))
    }
  }

  // 3. Ninguna resolvió, o las comprobaciones fallaron — caer al diálogo de
  // abajo. Los hooks ya corrieron y el clasificador ya se consumió.
  return null
}

export { handleCoordinatorPermission }
export type { CoordinatorPermissionParams }
