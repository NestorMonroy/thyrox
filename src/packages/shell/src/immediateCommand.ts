/**
 * Porte fiel de `ccnmt: packages/shell/src/immediateCommand.ts`.
 *
 * Si los comandos de configuración de inferencia (`/model`, `/fast`,
 * `/effort`) deben ejecutarse de inmediato (durante una consulta en
 * curso) en vez de esperar a que termine el turno actual.
 *
 * Siempre habilitado para empleados de Anthropic; gateado por
 * experimento para usuarios externos.
 *
 * Porte COMPLETO: el único símbolo exportado de la fuente está presente.
 *
 * @module
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'

export function shouldInferenceConfigCommandBeImmediate(): boolean {
  return (
    process.env.USER_TYPE === 'ant' ||
    Boolean(
      getFeatureValue_CACHED_MAY_BE_STALE(
        'tengu_immediate_model_command',
        false,
      ),
    )
  )
}
