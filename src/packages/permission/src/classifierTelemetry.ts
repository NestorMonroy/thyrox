/**
 * Telemetría del clasificador de modo automático: el desenlace que se registra
 * y la forma del error que lo causó. Sin lógica de clasificación.
 *
 * Procedencia: `ccnmt: packages/permission/src/classifierTelemetry.ts`
 * (100 líneas, 4 exports). Ese árbol declara `"license": "UNLICENSED"`, así
 * que los cuerpos se **reimplementan** y no se copian.
 *
 * DIVERGENCIA DECLARADA: ninguna en conducta. El nombre del evento
 * (`tengu_auto_mode_outcome`) se conserva porque es el contrato del sumidero
 * de telemetría y ya es la convención de este árbol — medido, 553 sitios lo
 * usan. Renombrarlo aquí solo partiría el corpus en dos vocabularios; el
 * barrido, si se decide, es la tarea #249.
 */
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from '@anthropic-ai/sdk'
import { logEvent } from '@thyrox/local-observability'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/agent/eventMetadata.js'
import {
  getErrnoCode,
  isAbortError,
} from '@thyrox/local-observability/errorHelpers.js'
import { parsePromptTooLongTokenCounts } from '@thyrox/provider/errors.js'

export type AutoModeOutcome =
  | 'success'
  | 'parse_failure'
  | 'interrupted'
  | 'error'
  | 'transcript_too_long'

/**
 * Registra el desenlace de una evaluación del clasificador.
 *
 * Todos los campos de texto son de vocabulario cerrado —desenlace, nombre de
 * modelo, tipo de clasificador, clase de fallo—, nunca código ni rutas: es lo
 * que hace segura la conversión al tipo de metadata analítica.
 *
 * Las tres claves opcionales se añaden SÓLO si vienen. Una clave presente con
 * valor `undefined` no es lo mismo que ausente: el sumidero la serializaría
 * como columna vacía y ensuciaría el agregado.
 */
export function logAutoModeOutcome(
  outcome: AutoModeOutcome,
  model: string,
  extra?: {
    classifierType?: string
    failureKind?: string
    errorKind?: string
    durationMs?: number
    mainLoopTokens?: number
    classifierInputTokens?: number
    classifierTokensEst?: number
    transcriptActualTokens?: number
    transcriptLimitTokens?: number
    stage1Attempts?: number
    stage2Attempts?: number
  },
): void {
  const { classifierType, failureKind, errorKind, ...rest } = extra ?? {}
  logEvent('tengu_auto_mode_outcome', {
    outcome:
      outcome as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    classifierModel:
      model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    ...(classifierType !== undefined && {
      classifierType:
        classifierType as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    }),
    ...(failureKind !== undefined && {
      failureKind:
        failureKind as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    }),
    ...(errorKind !== undefined && {
      errorKind:
        errorKind as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    }),
    ...rest,
  })
}

/**
 * Reduce un error del clasificador a una cadena estable para la telemetría.
 *
 * EL ORDEN DE LAS COMPROBACIONES ES PARTE DEL MECANISMO, no estilo:
 * `APIConnectionTimeoutError` EXTIENDE `APIConnectionError`, así que
 * invertirlas contaría todo timeout como error de conexión y la distinción
 * desaparecería del agregado sin que nada fallara. La interrupción va antes
 * que las dos porque un abort del reloj de pared no es un fallo del proveedor.
 */
export function classifyClassifierErrorKind(error: unknown): string {
  if (isAbortError(error)) return 'wall_clock_timeout'
  if (error instanceof APIConnectionTimeoutError) return 'connection_timeout'
  if (error instanceof APIConnectionError) return 'connection_error'
  if (error instanceof APIError && typeof error.status === 'number') {
    return `http_${error.status}`
  }
  const code = getErrnoCode(error)
  if (code) return code.toLowerCase()
  return 'other'
}

/**
 * Reconoce el error de transcripción demasiado larga y extrae sus dos cuentas.
 *
 * Es el único de la familia que NO vale reintentar: es determinista —la misma
 * transcripción da el mismo error— a diferencia de un 429 o un 5xx, que la
 * capa de consulta ya reintenta por su cuenta.
 */
export function detectPromptTooLong(
  error: unknown,
): ReturnType<typeof parsePromptTooLongTokenCounts> | undefined {
  if (!(error instanceof Error)) return undefined
  if (!error.message.toLowerCase().includes('prompt is too long')) {
    return undefined
  }
  return parsePromptTooLongTokenCounts(error.message)
}
